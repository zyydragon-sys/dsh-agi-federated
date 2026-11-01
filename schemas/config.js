/**
 * Configuration contract for dsh-agi-federated.
 *
 * This module is deliberately dependency-free: it can be imported by the Host
 * plugin, by a configuration checker, or by a packaging test without loading
 * the Harness. It performs normalization only; it never reads or writes the
 * user's package.json and never changes dependency ranges.
 */
import path from 'node:path'

export const CONFIG_VERSION = 1

/** The one mandatory persistence root. All plugin data must live below it. */
export const PERSIST_ROOT = 'D:\\DeepSeek Harness'

/** Default store, kept one level below the root so the installation folder stays readable. */
export const DEFAULT_DATA_DIR = path.win32.join(PERSIST_ROOT, 'agi-federated')

export const EVIDENCE_LEVELS = Object.freeze([
  'tested',
  'measured',
  'read_directly',
  'prior_verified',
  'documented',
  'community_practice',
  'assumption',
])

export const DIRECT_EVIDENCE_LEVELS = Object.freeze([
  'tested',
  'measured',
  'read_directly',
  'prior_verified',
])

export const DEFAULT_PRICING = Object.freeze({
  'deepseek/deepseek-chat': Object.freeze({
    input: 0.27,
    output: 1.1,
    cacheRead: 0.07,
    cacheWrite: 0.27,
  }),
  'deepseek/deepseek-reasoner': Object.freeze({
    input: 0.55,
    output: 2.19,
    cacheRead: 0.14,
    cacheWrite: 0.55,
  }),
  'openai/gpt-4o': Object.freeze({
    input: 2.5,
    output: 10,
    cacheRead: 1.25,
    cacheWrite: 2.5,
  }),
  'openai/gpt-4o-mini': Object.freeze({
    input: 0.15,
    output: 0.6,
    cacheRead: 0.075,
    cacheWrite: 0.15,
  }),
  'anthropic/claude-3-5-sonnet': Object.freeze({
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheWrite: 3.75,
  }),
  'anthropic/claude-3-5-haiku': Object.freeze({
    input: 0.8,
    output: 4,
    cacheRead: 0.08,
    cacheWrite: 1,
  }),
  'google/gemini-1.5-pro': Object.freeze({
    input: 1.25,
    output: 5,
    cacheRead: 0.3125,
    cacheWrite: 1.25,
  }),
  'google/gemini-1.5-flash': Object.freeze({
    input: 0.075,
    output: 0.3,
    cacheRead: 0.01875,
    cacheWrite: 0.075,
  }),
  '*': Object.freeze({
    input: 1,
    output: 3,
    cacheRead: 0.5,
    cacheWrite: 1,
  }),
})

export const DEFAULT_PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'deepseek',
    label: 'DeepSeek',
    protocol: 'deepseek-account',
    credentialEnv: 'DEEPSEEK_API_KEY',
    balanceUrl: '',
    balanceJsonPath: '',
    balanceMultiplier: 1,
    spendOnly: false,
    monthlyBudgetUsd: 0,
    currency: 'CNY',
    enabled: true,
  }),
  Object.freeze({
    id: 'openai',
    label: 'OpenAI',
    protocol: 'openai',
    credentialEnv: 'OPENAI_API_KEY',
    balanceUrl: '',
    balanceJsonPath: '',
    balanceMultiplier: 1,
    spendOnly: true,
    monthlyBudgetUsd: 0,
    currency: 'USD',
    enabled: true,
  }),
  Object.freeze({
    id: 'anthropic',
    label: 'Anthropic',
    protocol: 'anthropic',
    credentialEnv: 'ANTHROPIC_API_KEY',
    balanceUrl: '',
    balanceJsonPath: '',
    balanceMultiplier: 1,
    spendOnly: true,
    monthlyBudgetUsd: 0,
    currency: 'USD',
    enabled: true,
  }),
  Object.freeze({
    id: 'google',
    label: 'Google',
    protocol: 'gemini',
    credentialEnv: 'GEMINI_API_KEY',
    balanceUrl: '',
    balanceJsonPath: '',
    balanceMultiplier: 1,
    spendOnly: true,
    monthlyBudgetUsd: 0,
    currency: 'USD',
    enabled: true,
  }),
])

export const DEFAULT_CONFIG = Object.freeze({
  configVersion: CONFIG_VERSION,
  dataDir: DEFAULT_DATA_DIR,
  memory: Object.freeze({
    enabled: true,
    hotMaxItems: 24,
    hotMaxChars: 1200,
    clueMaxItems: 2000,
    summaryMaxChars: 220,
    bm25K1: 1.2,
    bm25B: 0.75,
    recallTopK: 6,
    recallMinScore: 0.35,
    injectionMaxChars: 3200,
    injectOrder: 64,
    persistDebounceMs: 900,
  }),
  context: Object.freeze({
    enabled: true,
    keepRecentTurns: 6,
    minEvictNodes: 4,
    placeholderLength: 160,
    idleDelayMs: 1200,
  }),
  skills: Object.freeze({
    enabled: true,
    maxStaged: 100,
    maxContentBytes: 65536,
    reviewDelayMs: 2500,
    minContentChars: 40,
    rejectMarkers: Object.freeze(['TODO', 'FIXME', 'TBD', 'PLACEHOLDER', 'OMITTED']),
  }),
  evidence: Object.freeze({
    enabled: true,
    indexLimit: 400,
    globalIndexLimit: 4000,
    gateMode: 'enforce',
    blockOnUnverified: true,
    guardTools: Object.freeze(['write', 'edit']),
    maxClaimsPerCall: 24,
    prompt: true,
    ownKeywordMinOverlap: 1,
    existenceBaseline: true,
  }),
  usage: Object.freeze({
    enabled: true,
    refreshIntervalMs: 1000,
    streamDebounceMs: 150,
    statusPollMs: 2000,
    currency: 'USD',
    defaultMonthlyBudgetUsd: 0,
    breakerCooldownMs: 60000,
    estimateCharsPerToken: 4,
    includeUsage: true,
    maxSessions: 256,
    pricing: DEFAULT_PRICING,
    providers: DEFAULT_PROVIDERS,
  }),
  security: Object.freeze({
    enforce: true,
    workspaceCredentialEnv: Object.freeze(['DSH_AGI_WORKSPACE_TOKEN']),
    denyWritesWithoutCredential: false,
    auditFile: 'audit.jsonl',
    auditMaxLines: 20000,
  }),
  federation: Object.freeze({
    jepa: Object.freeze({
      enabled: true,
      allow: true,
      blocking: false,
      timeoutMs: 50,
    }),
    cuv: Object.freeze({
      enabled: true,
      allow: true,
      blocking: false,
      timeoutMs: 50,
    }),
    mpRcp: Object.freeze({
      enabled: true,
      allow: true,
      blocking: false,
      timeoutMs: 50,
    }),
  }),
  compat: Object.freeze({
    enabled: true,
    warnOnly: true,
  }),
  ui: Object.freeze({
    enabled: true,
    pollIntervalMs: 2000,
    startCollapsed: false,
    position: 'bottom-right',
  }),
})

export const CONFIG_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://local.dsh/dsh-agi-federated/config.schema.json',
  title: 'dsh-agi-federated configuration',
  type: 'object',
  additionalProperties: false,
  properties: {
    configVersion: { type: 'integer', minimum: 1, default: CONFIG_VERSION },
    dataDir: {
      type: 'string',
      default: DEFAULT_DATA_DIR,
      description: `Mandatory persistence directory below ${PERSIST_ROOT}.`,
    },
    memory: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        hotMaxItems: { type: 'integer', minimum: 1, maximum: 200, default: 24 },
        hotMaxChars: { type: 'integer', minimum: 256, maximum: 20000, default: 1200 },
        clueMaxItems: { type: 'integer', minimum: 50, maximum: 20000, default: 2000 },
        summaryMaxChars: { type: 'integer', minimum: 80, maximum: 2000, default: 220 },
        bm25K1: { type: 'number', minimum: 0.1, maximum: 5, default: 1.2 },
        bm25B: { type: 'number', minimum: 0, maximum: 1, default: 0.75 },
        recallTopK: { type: 'integer', minimum: 0, maximum: 50, default: 6 },
        recallMinScore: { type: 'number', minimum: 0, maximum: 100, default: 0.35 },
        injectionMaxChars: { type: 'integer', minimum: 512, maximum: 20000, default: 3200 },
        injectOrder: { type: 'number', minimum: -1000, maximum: 1000, default: 64 },
        persistDebounceMs: { type: 'integer', minimum: 100, maximum: 60000, default: 900 },
      },
    },
    context: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        keepRecentTurns: { type: 'integer', minimum: 1, maximum: 100, default: 6 },
        minEvictNodes: { type: 'integer', minimum: 1, maximum: 100, default: 4 },
        placeholderLength: { type: 'integer', minimum: 96, maximum: 512, default: 160 },
        idleDelayMs: { type: 'integer', minimum: 0, maximum: 60000, default: 1200 },
      },
    },
    skills: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        maxStaged: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
        maxContentBytes: { type: 'integer', minimum: 1024, maximum: 1048576, default: 65536 },
        reviewDelayMs: { type: 'integer', minimum: 0, maximum: 120000, default: 2500 },
        minContentChars: { type: 'integer', minimum: 8, maximum: 4096, default: 40 },
        rejectMarkers: {
          type: 'array',
          items: { type: 'string' },
          default: ['TODO', 'FIXME', 'TBD', 'PLACEHOLDER', 'OMITTED'],
        },
      },
    },
    evidence: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        indexLimit: { type: 'integer', minimum: 1, maximum: 400, default: 400 },
        globalIndexLimit: { type: 'integer', minimum: 400, maximum: 20000, default: 4000 },
        gateMode: { type: 'string', enum: ['enforce', 'ask', 'observe'], default: 'enforce' },
        blockOnUnverified: { type: 'boolean', default: true },
        guardTools: {
          type: 'array',
          items: { type: 'string' },
          default: ['write', 'edit'],
        },
        maxClaimsPerCall: { type: 'integer', minimum: 1, maximum: 100, default: 24 },
        prompt: { type: 'boolean', default: true },
        ownKeywordMinOverlap: { type: 'integer', minimum: 1, maximum: 10, default: 1 },
        existenceBaseline: { type: 'boolean', default: true },
      },
    },
    usage: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        refreshIntervalMs: { type: 'integer', minimum: 500, maximum: 60000, default: 1000 },
        streamDebounceMs: { type: 'integer', minimum: 50, maximum: 5000, default: 150 },
        statusPollMs: { type: 'integer', minimum: 500, maximum: 60000, default: 2000 },
        currency: { type: 'string', default: 'USD' },
        defaultMonthlyBudgetUsd: { type: 'number', minimum: 0, default: 0 },
        breakerCooldownMs: { type: 'integer', minimum: 1000, maximum: 86400000, default: 60000 },
        estimateCharsPerToken: { type: 'integer', minimum: 1, maximum: 16, default: 4 },
        includeUsage: { type: 'boolean', default: true },
        maxSessions: { type: 'integer', minimum: 1, maximum: 5000, default: 256 },
        pricing: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: false,
            properties: {
              input: { type: 'number', minimum: 0 },
              output: { type: 'number', minimum: 0 },
              cacheRead: { type: 'number', minimum: 0 },
              cacheWrite: { type: 'number', minimum: 0 },
            },
          },
        },
        providers: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            required: ['id'],
            properties: {
              id: { type: 'string', minLength: 1 },
              label: { type: 'string' },
              protocol: { type: 'string' },
              credentialEnv: { type: 'string' },
              balanceUrl: { type: 'string' },
              balanceJsonPath: { type: 'string' },
              balanceMultiplier: { type: 'number', minimum: 0 },
              spendOnly: { type: 'boolean' },
              monthlyBudgetUsd: { type: 'number', minimum: 0 },
              currency: { type: 'string' },
              enabled: { type: 'boolean' },
            },
          },
        },
      },
    },
    security: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enforce: { type: 'boolean', default: true },
        workspaceCredentialEnv: {
          type: 'array',
          items: { type: 'string' },
          default: ['DSH_AGI_WORKSPACE_TOKEN'],
        },
        denyWritesWithoutCredential: { type: 'boolean', default: false },
        auditFile: { type: 'string', default: 'audit.jsonl' },
        auditMaxLines: { type: 'integer', minimum: 100, maximum: 1000000, default: 20000 },
      },
    },
    federation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        jepa: { $ref: '#/$defs/seam' },
        cuv: { $ref: '#/$defs/seam' },
        mpRcp: { $ref: '#/$defs/seam' },
      },
    },
    compat: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        warnOnly: { type: 'boolean', default: true },
      },
    },
    ui: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        pollIntervalMs: { type: 'integer', minimum: 500, maximum: 60000, default: 2000 },
        startCollapsed: { type: 'boolean', default: false },
        position: {
          type: 'string',
          enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
          default: 'bottom-right',
        },
      },
    },
  },
  $defs: {
    seam: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean', default: true },
        allow: { type: 'boolean', default: true },
        blocking: { type: 'boolean', default: false },
        timeoutMs: { type: 'integer', minimum: 0, maximum: 5000, default: 50 },
      },
    },
  },
})

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone)
  if (isPlainObject(value)) {
    const out = {}
    for (const key of Object.keys(value)) out[key] = deepClone(value[key])
    return out
  }
  return value
}

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? deepClone(patch) : deepClone(base)
  if (!isPlainObject(base)) return patch === undefined ? base : deepClone(patch)
  const out = deepClone(base)
  if (!isPlainObject(patch)) return out
  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) continue
    if (isPlainObject(out[key]) && isPlainObject(patch[key])) out[key] = deepMerge(out[key], patch[key])
    else out[key] = deepClone(patch[key])
  }
  return out
}

function clampNumber(value, fallback, min, max) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function clampInteger(value, fallback, min, max) {
  return Math.round(clampNumber(value, fallback, min, max))
}

function clampString(value, fallback, maxLength = 2000) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (trimmed.length === 0) return fallback
  return trimmed.slice(0, maxLength)
}

function clampBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function clampStringArray(value, fallback, maxItems = 32, maxLength = 256) {
  if (!Array.isArray(value)) return deepClone(fallback)
  const out = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    if (out.includes(trimmed)) continue
    out.push(trimmed.slice(0, maxLength))
    if (out.length >= maxItems) break
  }
  return out.length > 0 ? out : deepClone(fallback)
}

/**
 * Normalize a candidate persistence directory and force it below PERSIST_ROOT.
 * A malformed or escaping path degrades to the default directory; it never
 * escapes the mandatory root.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeDataDir(raw) {
  try {
    if (typeof raw !== 'string' || raw.trim() === '') return DEFAULT_DATA_DIR
    const normalized = path.win32.normalize(raw.trim().replace(/\//g, '\\'))
    const root = path.win32.normalize(PERSIST_ROOT)
    const rootWithSep = root.endsWith('\\') ? root : `${root}\\`
    const candidate = normalized.endsWith('\\') ? normalized.slice(0, -1) : normalized
    if (candidate.toLowerCase() === root.toLowerCase()) return root
    if (!candidate.toLowerCase().startsWith(rootWithSep.toLowerCase())) return DEFAULT_DATA_DIR
    return candidate
  } catch {
    return DEFAULT_DATA_DIR
  }
}

function normalizeProvider(raw, index) {
  const fallback = DEFAULT_PROVIDERS[index] || DEFAULT_PROVIDERS[0]
  const source = isPlainObject(raw) ? raw : {}
  const id = clampString(source.id, fallback.id, 64).replace(/[^A-Za-z0-9._-]/g, '-')
  return {
    id,
    label: clampString(source.label, fallback.label, 120),
    protocol: clampString(source.protocol, fallback.protocol, 40),
    credentialEnv: clampString(source.credentialEnv, fallback.credentialEnv, 120),
    balanceUrl: clampString(source.balanceUrl, fallback.balanceUrl, 2000),
    balanceJsonPath: clampString(source.balanceJsonPath, fallback.balanceJsonPath, 200),
    balanceMultiplier: clampNumber(source.balanceMultiplier, fallback.balanceMultiplier, 0, 1e9),
    spendOnly: clampBoolean(source.spendOnly, fallback.spendOnly),
    monthlyBudgetUsd: clampNumber(source.monthlyBudgetUsd, fallback.monthlyBudgetUsd, 0, 1e9),
    currency: clampString(source.currency, fallback.currency, 8).toUpperCase(),
    enabled: clampBoolean(source.enabled, fallback.enabled),
  }
}

function normalizeProviders(raw) {
  const list = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_PROVIDERS
  const seen = new Set()
  const out = []
  for (let index = 0; index < list.length; index += 1) {
    const provider = normalizeProvider(list[index], index)
    if (seen.has(provider.id)) continue
    seen.add(provider.id)
    out.push(provider)
  }
  return out.length > 0 ? out : deepClone(DEFAULT_PROVIDERS)
}

function normalizePricing(raw) {
  const merged = deepMerge(DEFAULT_PRICING, isPlainObject(raw) ? raw : {})
  const out = {}
  for (const key of Object.keys(merged)) {
    const entry = isPlainObject(merged[key]) ? merged[key] : {}
    out[key] = {
      input: clampNumber(entry.input, DEFAULT_PRICING['*'].input, 0, 1e6),
      output: clampNumber(entry.output, DEFAULT_PRICING['*'].output, 0, 1e6),
      cacheRead: clampNumber(entry.cacheRead, DEFAULT_PRICING['*'].cacheRead, 0, 1e6),
      cacheWrite: clampNumber(entry.cacheWrite, DEFAULT_PRICING['*'].cacheWrite, 0, 1e6),
    }
  }
  if (!out['*']) out['*'] = deepClone(DEFAULT_PRICING['*'])
  return out
}

function normalizeSeam(raw, fallback) {
  const source = isPlainObject(raw) ? raw : {}
  return {
    enabled: clampBoolean(source.enabled, fallback.enabled),
    allow: clampBoolean(source.allow, fallback.allow),
    blocking: clampBoolean(source.blocking, fallback.blocking),
    timeoutMs: clampInteger(source.timeoutMs, fallback.timeoutMs, 0, 5000),
  }
}

/**
 * Merge user configuration over defaults, clamp every numeric field, and
 * enforce the mandatory data directory. This function is total: invalid input
 * produces a valid defaulted configuration.
 * @param {unknown} raw
 * @returns {typeof DEFAULT_CONFIG}
 */
export function normalizeConfig(raw) {
  const source = isPlainObject(raw) ? raw : {}
  const merged = deepMerge(DEFAULT_CONFIG, source)

  merged.configVersion = CONFIG_VERSION
  merged.dataDir = normalizeDataDir(merged.dataDir)

  const memory = isPlainObject(merged.memory) ? merged.memory : {}
  merged.memory = {
    enabled: clampBoolean(memory.enabled, DEFAULT_CONFIG.memory.enabled),
    hotMaxItems: clampInteger(memory.hotMaxItems, DEFAULT_CONFIG.memory.hotMaxItems, 1, 200),
    hotMaxChars: clampInteger(memory.hotMaxChars, DEFAULT_CONFIG.memory.hotMaxChars, 256, 20000),
    clueMaxItems: clampInteger(memory.clueMaxItems, DEFAULT_CONFIG.memory.clueMaxItems, 50, 20000),
    summaryMaxChars: clampInteger(memory.summaryMaxChars, DEFAULT_CONFIG.memory.summaryMaxChars, 80, 2000),
    bm25K1: clampNumber(memory.bm25K1, DEFAULT_CONFIG.memory.bm25K1, 0.1, 5),
    bm25B: clampNumber(memory.bm25B, DEFAULT_CONFIG.memory.bm25B, 0, 1),
    recallTopK: clampInteger(memory.recallTopK, DEFAULT_CONFIG.memory.recallTopK, 0, 50),
    recallMinScore: clampNumber(memory.recallMinScore, DEFAULT_CONFIG.memory.recallMinScore, 0, 100),
    injectionMaxChars: clampInteger(
      memory.injectionMaxChars,
      DEFAULT_CONFIG.memory.injectionMaxChars,
      512,
      20000,
    ),
    injectOrder: clampNumber(memory.injectOrder, DEFAULT_CONFIG.memory.injectOrder, -1000, 1000),
    persistDebounceMs: clampInteger(
      memory.persistDebounceMs,
      DEFAULT_CONFIG.memory.persistDebounceMs,
      100,
      60000,
    ),
  }

  const context = isPlainObject(merged.context) ? merged.context : {}
  merged.context = {
    enabled: clampBoolean(context.enabled, DEFAULT_CONFIG.context.enabled),
    keepRecentTurns: clampInteger(
      context.keepRecentTurns,
      DEFAULT_CONFIG.context.keepRecentTurns,
      1,
      100,
    ),
    minEvictNodes: clampInteger(context.minEvictNodes, DEFAULT_CONFIG.context.minEvictNodes, 1, 100),
    placeholderLength: clampInteger(
      context.placeholderLength,
      DEFAULT_CONFIG.context.placeholderLength,
      96,
      512,
    ),
    idleDelayMs: clampInteger(context.idleDelayMs, DEFAULT_CONFIG.context.idleDelayMs, 0, 60000),
  }

  const skills = isPlainObject(merged.skills) ? merged.skills : {}
  merged.skills = {
    enabled: clampBoolean(skills.enabled, DEFAULT_CONFIG.skills.enabled),
    maxStaged: clampInteger(skills.maxStaged, DEFAULT_CONFIG.skills.maxStaged, 1, 1000),
    maxContentBytes: clampInteger(
      skills.maxContentBytes,
      DEFAULT_CONFIG.skills.maxContentBytes,
      1024,
      1048576,
    ),
    reviewDelayMs: clampInteger(skills.reviewDelayMs, DEFAULT_CONFIG.skills.reviewDelayMs, 0, 120000),
    minContentChars: clampInteger(
      skills.minContentChars,
      DEFAULT_CONFIG.skills.minContentChars,
      8,
      4096,
    ),
    rejectMarkers: clampStringArray(
      skills.rejectMarkers,
      DEFAULT_CONFIG.skills.rejectMarkers,
      32,
      64,
    ),
  }

  const evidence = isPlainObject(merged.evidence) ? merged.evidence : {}
  merged.evidence = {
    enabled: clampBoolean(evidence.enabled, DEFAULT_CONFIG.evidence.enabled),
    indexLimit: clampInteger(evidence.indexLimit, DEFAULT_CONFIG.evidence.indexLimit, 1, 400),
    globalIndexLimit: clampInteger(
      evidence.globalIndexLimit,
      DEFAULT_CONFIG.evidence.globalIndexLimit,
      400,
      20000,
    ),
    gateMode: ['enforce', 'ask', 'observe'].includes(evidence.gateMode)
      ? evidence.gateMode
      : DEFAULT_CONFIG.evidence.gateMode,
    blockOnUnverified: clampBoolean(
      evidence.blockOnUnverified,
      DEFAULT_CONFIG.evidence.blockOnUnverified,
    ),
    guardTools: clampStringArray(evidence.guardTools, DEFAULT_CONFIG.evidence.guardTools, 32, 80),
    maxClaimsPerCall: clampInteger(
      evidence.maxClaimsPerCall,
      DEFAULT_CONFIG.evidence.maxClaimsPerCall,
      1,
      100,
    ),
    prompt: clampBoolean(evidence.prompt, DEFAULT_CONFIG.evidence.prompt),
    ownKeywordMinOverlap: clampInteger(
      evidence.ownKeywordMinOverlap,
      DEFAULT_CONFIG.evidence.ownKeywordMinOverlap,
      1,
      10,
    ),
    existenceBaseline: clampBoolean(
      evidence.existenceBaseline,
      DEFAULT_CONFIG.evidence.existenceBaseline,
    ),
  }

  const usage = isPlainObject(merged.usage) ? merged.usage : {}
  merged.usage = {
    enabled: clampBoolean(usage.enabled, DEFAULT_CONFIG.usage.enabled),
    refreshIntervalMs: clampInteger(
      usage.refreshIntervalMs,
      DEFAULT_CONFIG.usage.refreshIntervalMs,
      500,
      60000,
    ),
    streamDebounceMs: clampInteger(
      usage.streamDebounceMs,
      DEFAULT_CONFIG.usage.streamDebounceMs,
      50,
      5000,
    ),
    statusPollMs: clampInteger(
      usage.statusPollMs,
      DEFAULT_CONFIG.usage.statusPollMs,
      500,
      60000,
    ),
    currency: clampString(usage.currency, DEFAULT_CONFIG.usage.currency, 8).toUpperCase(),
    defaultMonthlyBudgetUsd: clampNumber(
      usage.defaultMonthlyBudgetUsd,
      DEFAULT_CONFIG.usage.defaultMonthlyBudgetUsd,
      0,
      1e9,
    ),
    breakerCooldownMs: clampInteger(
      usage.breakerCooldownMs,
      DEFAULT_CONFIG.usage.breakerCooldownMs,
      1000,
      86400000,
    ),
    estimateCharsPerToken: clampInteger(
      usage.estimateCharsPerToken,
      DEFAULT_CONFIG.usage.estimateCharsPerToken,
      1,
      16,
    ),
    includeUsage: clampBoolean(usage.includeUsage, DEFAULT_CONFIG.usage.includeUsage),
    maxSessions: clampInteger(usage.maxSessions, DEFAULT_CONFIG.usage.maxSessions, 1, 5000),
    pricing: normalizePricing(usage.pricing),
    providers: normalizeProviders(usage.providers),
  }

  const security = isPlainObject(merged.security) ? merged.security : {}
  merged.security = {
    enforce: clampBoolean(security.enforce, DEFAULT_CONFIG.security.enforce),
    workspaceCredentialEnv: clampStringArray(
      security.workspaceCredentialEnv,
      DEFAULT_CONFIG.security.workspaceCredentialEnv,
      16,
      120,
    ),
    denyWritesWithoutCredential: clampBoolean(
      security.denyWritesWithoutCredential,
      DEFAULT_CONFIG.security.denyWritesWithoutCredential,
    ),
    auditFile: clampString(security.auditFile, DEFAULT_CONFIG.security.auditFile, 128).replace(
      /[^A-Za-z0-9._-]/g,
      '_',
    ),
    auditMaxLines: clampInteger(
      security.auditMaxLines,
      DEFAULT_CONFIG.security.auditMaxLines,
      100,
      1000000,
    ),
  }

  const federation = isPlainObject(merged.federation) ? merged.federation : {}
  merged.federation = {
    jepa: normalizeSeam(federation.jepa, DEFAULT_CONFIG.federation.jepa),
    cuv: normalizeSeam(federation.cuv, DEFAULT_CONFIG.federation.cuv),
    mpRcp: normalizeSeam(federation.mpRcp, DEFAULT_CONFIG.federation.mpRcp),
  }

  const compat = isPlainObject(merged.compat) ? merged.compat : {}
  merged.compat = {
    enabled: clampBoolean(compat.enabled, DEFAULT_CONFIG.compat.enabled),
    warnOnly: clampBoolean(compat.warnOnly, DEFAULT_CONFIG.compat.warnOnly),
  }

  const ui = isPlainObject(merged.ui) ? merged.ui : {}
  merged.ui = {
    enabled: clampBoolean(ui.enabled, DEFAULT_CONFIG.ui.enabled),
    pollIntervalMs: clampInteger(ui.pollIntervalMs, DEFAULT_CONFIG.ui.pollIntervalMs, 500, 60000),
    startCollapsed: clampBoolean(ui.startCollapsed, DEFAULT_CONFIG.ui.startCollapsed),
    position: ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(ui.position)
      ? ui.position
      : DEFAULT_CONFIG.ui.position,
  }

  return deepFreeze(merged)
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value
  if (Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const key of Object.keys(value)) deepFreeze(value[key])
  return value
}

/**
 * Validate a raw configuration without throwing. `normalizeConfig` always
 * yields a usable value; the returned errors explain what was repaired.
 * @param {unknown} raw
 * @returns {{ok: boolean, value: ReturnType<typeof normalizeConfig>, errors: string[], warnings: string[]}}
 */
export function validateConfig(raw) {
  const errors = []
  const warnings = []
  if (raw !== undefined && raw !== null && !isPlainObject(raw)) {
    errors.push('configuration root must be an object')
  }
  const source = isPlainObject(raw) ? raw : {}
  if (typeof source.dataDir === 'string') {
    const enforced = normalizeDataDir(source.dataDir)
    if (enforced !== path.win32.normalize(source.dataDir.replace(/\//g, '\\'))) {
      warnings.push(`dataDir was forced below ${PERSIST_ROOT}`)
    }
  }
  if (Array.isArray(source.usage?.providers)) {
    for (const [index, provider] of source.usage.providers.entries()) {
      if (!isPlainObject(provider)) {
        errors.push(`usage.providers[${index}] must be an object`)
        continue
      }
      if (typeof provider.id !== 'string' || provider.id.trim() === '') {
        errors.push(`usage.providers[${index}].id must be a non-empty string`)
      }
      if (provider.monthlyBudgetUsd !== undefined && !Number.isFinite(Number(provider.monthlyBudgetUsd))) {
        errors.push(`usage.providers[${index}].monthlyBudgetUsd must be a finite number`)
      }
    }
  }
  if (source.evidence?.gateMode !== undefined && !['enforce', 'ask', 'observe'].includes(source.evidence.gateMode)) {
    errors.push('evidence.gateMode must be enforce, ask, or observe')
  }
  if (source.context?.placeholderLength !== undefined) {
    const length = Number(source.context.placeholderLength)
    if (!Number.isInteger(length) || length < 96 || length > 512) {
      errors.push('context.placeholderLength must be an integer from 96 to 512')
    }
  }
  return {
    ok: errors.length === 0,
    value: normalizeConfig(source),
    errors,
    warnings,
  }
}

export default CONFIG_SCHEMA
