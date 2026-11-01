/**
 * dsh-agi-federated — Host plugin.
 *
 * The implementation is deliberately dependency-free at runtime (Node built-ins
 * plus the Harness services reached through `ctx.get(...)`). Every external
 * service is optional and every filesystem, network, and version comparison is
 * allowed to degrade without blocking the agent loop.
 */
import { createHash, randomUUID } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG_VERSION, DEFAULT_CONFIG, normalizeConfig, validateConfig } from './schemas/config.js'

const PLUGIN_ID = 'dsh-agi-federated'
const PLUGIN_VERSION = '1.4.0'
const MEMORY_FILE = 'memory.json'
const EVIDENCE_FILE = 'evidence.json'
const USAGE_FILE = 'usage.json'
const CHECKPOINT_FILE = 'checkpoints.json'
const CHECKPOINT_PREFIX = '[AGI_CHECKPOINT v1'
const CHECKPOINT_SUFFIX = ']'
const OPENAI_PROTOCOLS = new Set(['openai', 'openai-compatible', 'deepseek', 'deepseek-account'])
const ANTHROPIC_PROTOCOLS = new Set(['anthropic', 'claude'])
const GEMINI_PROTOCOLS = new Set(['gemini', 'google'])
const TEST_TOOLS = new Set([
  'bash',
  'pwsh',
  'shell',
  'run',
  'run_code',
  'test',
  'pytest',
  'npm',
  'pnpm',
  'yarn',
  'cargo',
  'go',
  'dotnet',
  'mvn',
  'gradle',
])
const READ_TOOLS = new Set([
  'read',
  'read_image',
  'glob',
  'grep',
  'web_fetch',
  'web_search',
  'session_search',
  'session_event_search',
  'session_trace',
])
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^\s"',;]{8,}/gi,
]

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'have',
  'will',
  'into',
  'your',
  'about',
  'after',
  'before',
  'there',
  'their',
  'what',
  'when',
  'where',
  'which',
  'while',
  'would',
  'could',
  'should',
  'then',
  'than',
  'them',
  'they',
  'been',
  'being',
  'were',
  'was',
  'are',
  'is',
  'it',
  'its',
  'a',
  'an',
  'of',
  'to',
  'in',
  'on',
  'at',
  'by',
  'as',
  'or',
  'if',
  'we',
  'you',
  'i',
  'not',
  'no',
  'be',
  'do',
  'does',
  'did',
  'has',
  'had',
  'can',
  'may',
  'use',
  'used',
  'using',
  '一个',
  '我们',
  '这个',
  '那个',
  '以及',
  '并且',
  '但是',
  '因为',
  '所以',
  '如果',
  '可以',
  '需要',
  '进行',
  '通过',
  '已经',
  '没有',
  '什么',
  '怎么',
  '这里',
  '那里',
])

const EVIDENCE_PROMPT = [
  '[AGI FEDERATED EVIDENCE GATE]',
  'Every factual claim that enters a write/edit payload is checked before the tool runs.',
  'Use these evidence levels:',
  '- Direct: tested, measured, read_directly, prior_verified. State the concrete result, not a generic assurance.',
  '- Cited: documented, community_practice. Quote the source and keep its URL or path next to the claim.',
  '- Assumption: assumption. Label it explicitly and name the next verification step; never present it as fact.',
  'The Host keeps a per-session evidence index of tool parameter and output anchors. An unsupported claim is',
  'retried through this ladder: own-session anchor, own-session keyword, other-session anchor, existence baseline,',
  'then block. If blocked, gather evidence with a read/test/measurement call and rewrite the claim.',
].join('\n')

const FEDERATION_PROMPT = [
  '[AGI FEDERATED SEAMS]',
  'JEPA world-model, CUV value/conflict, and mp-rcp quorum seams are mounted as advisory arbiters.',
  'They default to allow, never block unless an operator explicitly marks a seam blocking, and failures are',
  'contained and logged as warnings. Federation is a side channel, not a gate on the agent loop.',
].join('\n')

// ---------------------------------------------------------------------------
// Small pure utilities
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function shortHash(value, length = 16) {
  return sha256(value).slice(0, length)
}

function stableStringify(value) {
  const seen = new Set()
  function walk(current) {
    if (current === null || current === undefined) return null
    if (typeof current === 'number') return Number.isFinite(current) ? current : null
    if (typeof current === 'bigint' || typeof current === 'function' || typeof current === 'symbol') {
      return null
    }
    if (typeof current !== 'object') return current
    if (seen.has(current)) return null
    seen.add(current)
    let result
    if (Array.isArray(current)) {
      result = current.map(walk)
    } else {
      result = {}
      for (const key of Object.keys(current).sort()) {
        if (current[key] === undefined) continue
        result[key] = walk(current[key])
      }
    }
    seen.delete(current)
    return result
  }
  try {
    return JSON.stringify(walk(value))
  } catch {
    return JSON.stringify({ error: 'unserializable' })
  }
}

function safeJson(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const key of Object.keys(value)) deepFreeze(value[key])
  return value
}

function cloneJson(value, fallback) {
  try {
    return value === undefined ? fallback : structuredClone(value)
  } catch {
    return fallback
  }
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function finiteNumber(value, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function round(value, digits = 6) {
  const factor = 10 ** digits
  return Math.round((finiteNumber(value) + Number.EPSILON) * factor) / factor
}

function truncateCodePoints(text, max) {
  const value = asString(text)
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1))}…`
}

function truncateBytes(text, maxBytes) {
  const value = asString(text)
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) return value
  let low = 0
  let high = value.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (Buffer.byteLength(value.slice(0, mid), 'utf8') <= maxBytes) low = mid
    else high = mid - 1
  }
  return value.slice(0, low)
}

function redactSecrets(text) {
  let value = asString(text)
  for (const pattern of SECRET_PATTERNS) {
    try {
      value = value.replace(pattern, '[REDACTED]')
    } catch {
      // A malformed pattern must never break a memory or audit write.
    }
  }
  return value
}

function stripCodeFences(text) {
  return asString(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
}

function normalizeWhitespace(text) {
  return asString(text).replace(/[ \t\f\v]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim()
}

function estimateTokens(text, charsPerToken = 4) {
  const value = asString(text)
  const density = Math.max(1, Math.min(16, Math.round(finiteNumber(charsPerToken, 4))))
  let ascii = 0
  let cjk = 0
  let other = 0
  for (const character of value) {
    const code = character.codePointAt(0) || 0
    if (code < 0x80) ascii += 1
    else if (
      (code >= 0x3400 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjk += 1
    } else {
      other += 1
    }
  }
  return Math.max(0, Math.ceil(ascii / density + cjk + other / 2))
}

function tokenize(text) {
  const normalized = asString(text).normalize('NFKC').toLowerCase()
  const raw = normalized.match(/[a-z0-9][a-z0-9_./#@+-]{0,63}|[\u3400-\u9fff]{1,}/g) || []
  const out = []
  for (const part of raw) {
    if (/^[\u3400-\u9fff]+$/.test(part)) {
      if (part.length === 1) {
        if (!STOPWORDS.has(part)) out.push(part)
        continue
      }
      for (let index = 0; index < part.length - 1; index += 1) {
        const gram = part.slice(index, index + 2)
        if (!STOPWORDS.has(gram)) out.push(gram)
      }
      if (part.length <= 4) out.push(part)
      continue
    }
    if (part.length < 2 || STOPWORDS.has(part)) continue
    if (/^\d+$/.test(part) && part.length < 2) continue
    out.push(part)
    if (out.length >= 512) break
  }
  return out
}

function uniqueTokens(text) {
  return [...new Set(tokenize(text))]
}

function keywordsOf(text, limit = 12) {
  const counts = new Map()
  for (const token of tokenize(text)) {
    if (token.length < 2 && !/[\u3400-\u9fff]/.test(token)) continue
    counts.set(token, (counts.get(token) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token)
}

function summarizeText(text, maxChars) {
  let value = stripCodeFences(redactSecrets(text))
  value = value
    .split(/\r?\n/)
    .map((line) => line.replace(/^#{1,6}\s*/, '').trim())
    .filter((line) => line.length > 0)
    .join(' ')
  value = normalizeWhitespace(value)
  if (value.length === 0) return ''
  const sentences = value.split(/(?<=[.!?。！？])\s+/).filter(Boolean)
  const selected = []
  let length = 0
  for (const sentence of sentences.slice(0, 4)) {
    if (length + sentence.length > maxChars) break
    selected.push(sentence)
    length += sentence.length + 1
  }
  const summary = selected.length > 0 ? selected.join(' ') : value
  return truncateCodePoints(summary, maxChars)
}

function classifyImportance(text, kind) {
  const value = asString(text).toLowerCase()
  let score = kind === 'tool' ? 2 : 3
  if (/(?:must|required|requirement|约束|必须|要求)/.test(value)) score += 2
  if (/(?:decided|decision|chose|chosen|决定|选定)/.test(value)) score += 2
  if (/(?:fixed|resolved|verified|tested|通过|修复|验证)/.test(value)) score += 2
  if (/(?:error|failed|blocked|failure|错误|失败|阻塞)/.test(value)) score += 3
  if (/(?:todo|next step|下一步|待办)/.test(value)) score += 1
  return Math.max(0, Math.min(10, score))
}

function cleanAnchor(value) {
  let text = asString(value).trim()
  while (/[.,;:)\]}'"`]$/.test(text)) text = text.slice(0, -1)
  return text
}

function collectAnchors(text) {
  const value = redactSecrets(asString(text))
  const found = new Map()
  const add = (kind, raw) => {
    const cleaned = cleanAnchor(raw)
    if (cleaned.length < 2 || cleaned.length > 2048) return
    const key = `${kind}:${cleaned.toLowerCase()}`
    if (!found.has(key)) found.set(key, { kind, value: cleaned })
  }

  for (const match of value.matchAll(/https?:\/\/[^\s"'`<>)\]}]+/g)) add('url', match[0])
  for (const match of value.matchAll(/\b[A-Za-z]:\\[^\s"'`<>|]+/g)) add('path', match[0])
  for (const match of value.matchAll(/(?:^|[\s("'`])((?:\.{1,2}\/|\/)[^\s"'`<>|]+)/g)) {
    add('path', match[1])
  }
  for (const match of value.matchAll(/\b(?:v|version\s*)?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/gi)) {
    add('version', match[1])
  }
  for (const match of value.matchAll(/\b\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds|MB|GB|KB|%|tokens?)\b/gi)) {
    add('measure', match[0])
  }
  for (const match of value.matchAll(/\b\d+\s*(?:tests?|checks?|cases?)\s*(?:pass|passed|passing|fail|failed|failing)?\b/gi)) {
    add('test', match[0])
  }
  for (const match of value.matchAll(/\bexit\s*(?:code)?\s*[:=]?\s*(\d+)\b/gi)) add('exit', match[1])
  for (const match of value.matchAll(/\b[a-f0-9]{7,64}\b/gi)) add('hash', match[0])
  return [...found.values()].slice(0, 256)
}

function anchorKey(anchor) {
  return `${anchor.kind}:${anchor.value.toLowerCase()}`
}

function extractClaimContent(argumentsValue) {
  if (typeof argumentsValue === 'string') return argumentsValue
  if (!isPlainObject(argumentsValue)) return ''
  for (const key of ['content', 'new_string', 'newText', 'text', 'body', 'patch']) {
    if (typeof argumentsValue[key] === 'string' && argumentsValue[key].trim().length > 0) {
      return argumentsValue[key]
    }
  }
  return ''
}

function extractClaimFacts(text, limit) {
  const source = redactSecrets(asString(text))
  const facts = []
  const seen = new Set()
  const add = (kind, raw) => {
    const value = cleanAnchor(raw)
    if (value.length < 2) return
    const key = `${kind}:${value.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    facts.push({ kind, value })
  }

  let inFence = false
  for (const rawLine of source.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (/^```|^~~~/.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence || trimmed.length === 0) continue
    if (/^(?:\/\/|#include|import\s|export\s|const\s|let\s|var\s|function\s|class\s|def\s|return\s|if\s*\(|for\s*\(|while\s*\()/.test(trimmed)) {
      continue
    }
    if (/(?:=>|\bTODO\b|\bFIXME\b|\bconsole\.log\b)/.test(trimmed)) continue
    const hasClaimWord = /(?:tested|verified|confirmed|measured|benchmark(?:ed)?|passed|failing|failed|version|supports|works|reduced|improved|faster|slower|coverage|exists|available|read|wrote|created|updated|validated|test|检查|验证|测试|通过|失败|版本|支持|测量)/i.test(trimmed)
    const hasPath = /(?:[A-Za-z]:\\|(?:^|\s)\.{1,2}\/)/.test(trimmed)
    if (!hasClaimWord && !hasPath) continue
    const prose = trimmed.replace(/https?:\/\/[^\s"'`<>)\]}]+/g, ' ')
    for (const match of prose.matchAll(/\b(?:v(?:ersion)?\s*)?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/gi)) {
      add('version', match[1])
    }
    for (const match of prose.matchAll(/\b\d+\s*(?:tests?|checks?|cases?)\s*(?:pass|passed|passing|fail|failed|failing)?\b/gi)) {
      add('test', match[0])
    }
    for (const match of prose.matchAll(/\ball\s+tests?\s+(?:pass|passed|passing)\b/gi)) add('test', match[0])
    for (const match of prose.matchAll(/\b\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds|MB|GB|KB|%|tokens?)\b/gi)) {
      add('measure', match[0])
    }
    for (const match of prose.matchAll(/\b[A-Za-z]:\\[^\s"'`<>|]+/g)) add('path', match[0])
    for (const match of prose.matchAll(/(?:^|[\s("'`])((?:\.{1,2}\/|\/)[^\s"'`<>|]+)/g)) add('path', match[1])
    for (const match of prose.matchAll(/https?:\/\/[^\s"'`<>)\]}]+/g)) add('url', match[0])
    for (const match of prose.matchAll(/\bexit\s*(?:code)?\s*[:=]?\s*(\d+)\b/gi)) add('exit', match[1])
    if (facts.length >= limit) break
  }
  return facts.slice(0, limit)
}

async function fileExists(target) {
  try {
    await fsp.stat(target)
    return true
  } catch {
    return false
  }
}

function parseSemver(value) {
  const text = asString(value).trim().replace(/^v/i, '')
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(text)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || '',
    raw: text,
  }
}

function compareSemver(left, right) {
  const a = parseSemver(left)
  const b = parseSemver(right)
  if (!a || !b) return 0
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1
  }
  if (a.prerelease === b.prerelease) return 0
  if (a.prerelease === '') return 1
  if (b.prerelease === '') return -1
  return a.prerelease.localeCompare(b.prerelease)
}

function satisfiesRange(version, range) {
  try {
    const rawRange = asString(range).trim()
    if (!rawRange || rawRange === '*' || rawRange === 'latest') return true
    const candidates = rawRange.split('||').map((part) => part.trim()).filter(Boolean)
    if (candidates.length === 0) return true
    return candidates.some((candidate) => {
      const parts = candidate.split(/\s+/).filter(Boolean)
      if (parts.length === 0) return true
      return parts.every((part) => satisfiesComparator(version, part))
    })
  } catch {
    return true
  }
}

function satisfiesComparator(version, comparator) {
  if (!comparator || comparator === '*') return true
  const base = parseSemver(version)
  if (!base) return true
  if (comparator.startsWith('~')) {
    const target = parseSemver(comparator.slice(1))
    if (!target) return true
    return compareSemver(version, target.raw) >= 0 &&
      base.major === target.major &&
      base.minor === target.minor
  }
  if (comparator.startsWith('^')) {
    const target = parseSemver(comparator.slice(1))
    if (!target) return true
    if (compareSemver(version, target.raw) < 0) return false
    if (target.major > 0) return base.major === target.major
    if (target.minor > 0) return base.major === 0 && base.minor === target.minor
    return base.major === 0 && base.minor === 0 && base.patch === target.patch
  }
  if (comparator.startsWith('>=')) {
    const target = parseSemver(comparator.slice(2))
    return target ? compareSemver(version, target.raw) >= 0 : true
  }
  if (comparator.startsWith('<=')) {
    const target = parseSemver(comparator.slice(2))
    return target ? compareSemver(version, target.raw) <= 0 : true
  }
  if (comparator.startsWith('>')) {
    const target = parseSemver(comparator.slice(1))
    return target ? compareSemver(version, target.raw) > 0 : true
  }
  if (comparator.startsWith('<')) {
    const target = parseSemver(comparator.slice(1))
    return target ? compareSemver(version, target.raw) < 0 : true
  }
  if (comparator.startsWith('=')) {
    const target = parseSemver(comparator.slice(1))
    return target ? compareSemver(version, target.raw) === 0 : true
  }
  const target = parseSemver(comparator)
  return target ? compareSemver(version, target.raw) === 0 : true
}

function monthKey(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function nextMonthStart(date = new Date()) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0)
}

/**
 * DeepSeek Flash peak windows in UTC: 01:00-04:00 and 06:00-10:00 on weekdays.
 * Chinese public holidays are not in this local calendar and are treated as
 * off-peak; the official page remains the billing source of truth.
 * https://api-docs.deepseek.com/quick_start/pricing
 */
function isDeepSeekPeak(date = new Date()) {
  const day = date.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = date.getUTCHours()
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10)
}

function isoTime(timestamp = Date.now()) {
  try {
    return new Date(timestamp).toISOString()
  } catch {
    return '1970-01-01T00:00:00.000Z'
  }
}

function formatUsd(value) {
  return `$${round(value, 4).toFixed(4)}`
}

function getByPath(value, dottedPath) {
  if (!dottedPath) return undefined
  let current = value
  for (const part of String(dottedPath).split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

function contentText(content, options = {}) {
  const includeReasoning = options.includeReasoning === true
  const includeToolCalls = options.includeToolCalls === true
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    // Hidden reasoning and raw tool-call arguments are never materialized into
    // memory, evidence, or checkpoint text. Opt in only for a caller that has a
    // deliberate reason to read them.
    else if (includeReasoning && block.type === 'reasoning' && typeof block.text === 'string') parts.push(block.text)
    else if (includeToolCalls && block.type === 'tool-call') parts.push(`[tool-call ${block.name || ''} ${block.arguments || ''}]`)
    else if (block.type === 'image') parts.push('[image]')
    else if (block.type === 'file') parts.push(`[file ${block.attachment?.name || ''}]`)
  }
  return parts.join('\n')
}

function messageText(message) {
  if (!message || typeof message !== 'object') return ''
  return redactSecrets(contentText(message.content))
}

function resultText(result) {
  if (!result || typeof result !== 'object') return ''
  const parts = []
  if (Array.isArray(result.content)) parts.push(contentText(result.content))
  if (result.value !== undefined) {
    try {
      parts.push(typeof result.value === 'string' ? result.value : JSON.stringify(result.value))
    } catch {
      parts.push(String(result.value))
    }
  }
  return redactSecrets(parts.join('\n')).slice(0, 12000)
}

function normalizeTokenUsage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const input = finiteNumber(
    raw.inputTokens ?? raw.input_tokens ?? raw.prompt_tokens ?? raw.promptTokenCount ??
      raw.prompt_token_count,
    0,
  )
  const output = finiteNumber(
    raw.outputTokens ?? raw.output_tokens ?? raw.completion_tokens ?? raw.candidatesTokenCount ??
      raw.candidates_token_count,
    0,
  )
  const cacheRead = finiteNumber(
    raw.cacheReadTokens ?? raw.cache_read_input_tokens ?? raw.cachedContentTokenCount ??
      raw.cached_content_token_count ?? raw.prompt_tokens_details?.cached_tokens ?? 0,
    0,
  )
  const cacheWrite = finiteNumber(
    raw.cacheWriteTokens ?? raw.cache_creation_input_tokens ?? 0,
    0,
  )
  const reasoning = finiteNumber(
    raw.reasoningTokens ?? raw.reasoning_tokens ?? raw.thoughtsTokenCount ??
      raw.thoughts_token_count ?? 0,
    0,
  )
  const total = finiteNumber(
    raw.totalTokens ?? raw.total_tokens ?? raw.totalTokenCount ?? raw.total_token_count,
    0,
  )
  if (input === 0 && output === 0 && cacheRead === 0 && cacheWrite === 0 && total === 0) return null
  return {
    inputTokens: Math.max(0, Math.round(input)),
    outputTokens: Math.max(0, Math.round(output)),
    cacheReadTokens: Math.max(0, Math.round(cacheRead)),
    cacheWriteTokens: Math.max(0, Math.round(cacheWrite)),
    reasoningTokens: Math.max(0, Math.round(reasoning)),
    totalTokens: Math.max(
      0,
      Math.round(total || input + output + cacheRead + cacheWrite),
    ),
  }
}

function parseOpenAIUsage(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.usage) return normalizeTokenUsage(payload.usage)
  if (payload.type === 'response.completed' && payload.response?.usage) {
    return normalizeTokenUsage(payload.response.usage)
  }
  if (Array.isArray(payload.choices) && payload.choices[0]?.usage) {
    return normalizeTokenUsage(payload.choices[0].usage)
  }
  return null
}

function parseAnthropicUsage(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.type === 'message_start' && payload.message?.usage) {
    return normalizeTokenUsage(payload.message.usage)
  }
  if (payload.type === 'message_delta' && payload.usage) {
    return normalizeTokenUsage(payload.usage)
  }
  if (payload.usage) return normalizeTokenUsage(payload.usage)
  return null
}

function parseGeminiUsage(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.usageMetadata) return normalizeTokenUsage(payload.usageMetadata)
  if (payload.response?.usageMetadata) return normalizeTokenUsage(payload.response.usageMetadata)
  return null
}

function usageAdd(left, right) {
  const a = left || {}
  const b = right || {}
  return {
    inputTokens: Math.max(finiteNumber(a.inputTokens) , finiteNumber(b.inputTokens)),
    outputTokens: Math.max(finiteNumber(a.outputTokens), finiteNumber(b.outputTokens)),
    cacheReadTokens: Math.max(finiteNumber(a.cacheReadTokens), finiteNumber(b.cacheReadTokens)),
    cacheWriteTokens: Math.max(finiteNumber(a.cacheWriteTokens), finiteNumber(b.cacheWriteTokens)),
    reasoningTokens: Math.max(finiteNumber(a.reasoningTokens), finiteNumber(b.reasoningTokens)),
    totalTokens: Math.max(finiteNumber(a.totalTokens), finiteNumber(b.totalTokens)),
  }
}

/**
 * Three wire-format usage parsers required by the federation contract:
 * OpenAI `include_usage`, Anthropic `message_start`/`message_delta`, and
 * Gemini `usageMetadata`. It also accepts normalized DSH `usage` chunks.
 */
class ProviderUsageTracker {
  constructor(provider) {
    this.provider = asString(provider).toLowerCase()
    this.usage = null
    this.anthropicStart = null
    this.finished = false
  }

  push(payload) {
    if (!payload || typeof payload !== 'object') return
    try {
      if (payload.type === 'usage' && payload.usage) {
        this.usage = usageAdd(this.usage, normalizeTokenUsage(payload.usage))
        return
      }
      if (payload.type === 'finish') this.finished = true
      if (OPENAI_PROTOCOLS.has(this.provider) || payload.usage || payload.choices) {
        const parsed = parseOpenAIUsage(payload)
        if (parsed) this.usage = usageAdd(this.usage, parsed)
      }
      if (ANTHROPIC_PROTOCOLS.has(this.provider) || payload.type === 'message_start' || payload.type === 'message_delta') {
        const parsed = parseAnthropicUsage(payload)
        if (parsed) {
          if (payload.type === 'message_start') this.anthropicStart = parsed
          this.usage = usageAdd(this.anthropicStart, usageAdd(this.usage, parsed))
        }
      }
      if (GEMINI_PROTOCOLS.has(this.provider) || payload.usageMetadata) {
        const parsed = parseGeminiUsage(payload)
        if (parsed) this.usage = usageAdd(this.usage, parsed)
      }
    } catch {
      // Adapter-specific payloads are best effort; a malformed frame never
      // breaks the token stream.
    }
  }

  snapshot() {
    return this.usage === null ? null : normalizeTokenUsage(this.usage)
  }
}

function extractUsageFromStream(records) {
  if (!Array.isArray(records)) return null
  let usage = null
  for (const record of records) {
    if (!record || typeof record !== 'object') continue
    if (record.type === 'chunk' && record.chunk) {
      const chunk = record.chunk
      if (chunk.type === 'usage' && chunk.usage) usage = usageAdd(usage, normalizeTokenUsage(chunk.usage))
      if (chunk.type === 'finish' && chunk.usage) usage = usageAdd(usage, normalizeTokenUsage(chunk.usage))
    }
    if (record.type === 'usage' && record.usage) usage = usageAdd(usage, normalizeTokenUsage(record.usage))
  }
  return usage === null ? null : normalizeTokenUsage(usage)
}

function makeCheckpointPlaceholder(startSeq, endSeq, length) {
  const width = Math.max(1, String(Math.max(0, length)).length)
  const start = String(Math.max(0, Math.trunc(startSeq))).padStart(10, '0').slice(-10)
  const end = String(Math.max(0, Math.trunc(endSeq))).padStart(10, '0').slice(-10)
  let text = `${CHECKPOINT_PREFIX} ${start}-${end}${CHECKPOINT_SUFFIX}`
  if (text.length > length) text = text.slice(0, length)
  const remaining = Math.max(0, length - text.length)
  const fill = remaining > 0 ? ` RETIRED-${'x'.repeat(Math.max(0, remaining - 9))}`.slice(0, remaining) : ''
  const result = text + fill
  return result.length === length ? result : result.padEnd(length, 'x').slice(0, length)
}

function isCheckpointText(text) {
  return asString(text).includes(CHECKPOINT_PREFIX)
}

function withTimeout(promise, timeoutMs) {
  const ms = Math.max(0, Math.trunc(finiteNumber(timeoutMs, 0)))
  if (ms === 0) {
    return Promise.resolve({ timedOut: true, value: undefined })
  }
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve({ timedOut: true, value: undefined })
    }, ms)
    if (typeof timer.unref === 'function') timer.unref()
    Promise.resolve(promise).then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ timedOut: false, value })
      },
      (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ timedOut: false, error })
      },
    )
  })
}

function abortableFetch(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Math.max(250, timeoutMs))
  if (typeof timer.unref === 'function') timer.unref()
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

// ---------------------------------------------------------------------------
// Durable store, hash-chained audit, usage ledger, evidence index, skills
// ---------------------------------------------------------------------------

class JsonStore {
  constructor(root, logger) {
    this.root = root
    this.logger = logger
    this.ok = false
    this.error = ''
    this.queues = new Map()
  }

  async init(directories) {
    try {
      await fsp.mkdir(this.root, { recursive: true })
      for (const directory of directories) {
        await fsp.mkdir(path.join(this.root, directory), { recursive: true })
      }
      const probe = path.join(this.root, `.write-probe-${process.pid}-${randomUUID()}`)
      await fsp.writeFile(probe, 'ok', { encoding: 'utf8', mode: 0o600 })
      await fsp.unlink(probe)
      this.ok = true
      return true
    } catch (error) {
      this.ok = false
      this.error = error instanceof Error ? error.message : String(error)
      this.logger.warn(`persistence degraded at ${this.root}: ${this.error}`)
      return false
    }
  }

  resolve(name) {
    const target = path.resolve(this.root, name)
    const root = path.resolve(this.root)
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new Error(`refusing path outside persistence root: ${name}`)
    }
    return target
  }

  enqueue(key, task) {
    const previous = this.queues.get(key) || Promise.resolve()
    const next = previous.then(task, task)
    this.queues.set(key, next.catch(() => undefined))
    return next
  }

  async readText(name) {
    try {
      return await fsp.readFile(this.resolve(name), 'utf8')
    } catch (error) {
      if (error && error.code === 'ENOENT') return null
      this.logger.warn(`read ${name} failed: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  async writeText(name, text) {
    if (!this.ok) throw new Error(this.error || 'persistence unavailable')
    await this.enqueue(name, async () => {
      const target = this.resolve(name)
      await fsp.mkdir(path.dirname(target), { recursive: true })
      const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
      try {
        await fsp.writeFile(temporary, text, { encoding: 'utf8', mode: 0o600 })
        await fsp.rename(temporary, target)
      } catch (error) {
        try {
          await fsp.unlink(temporary)
        } catch {
          // Best effort cleanup only.
        }
        throw error
      }
    })
  }

  async readJson(name, fallback) {
    const text = await this.readText(name)
    if (text === null) return fallback
    try {
      return JSON.parse(text)
    } catch {
      this.logger.warn(`corrupt JSON at ${name}; using fallback`)
      try {
        await fsp.rename(this.resolve(name), `${this.resolve(name)}.corrupt-${Date.now()}`)
      } catch {
        // A read-only degraded store simply keeps the fallback.
      }
      return fallback
    }
  }

  async writeJson(name, value) {
    await this.writeText(name, `${stableStringify(value)}\n`)
  }

  async appendLine(name, line) {
    if (!this.ok) throw new Error(this.error || 'persistence unavailable')
    await this.enqueue(name, async () => {
      const target = this.resolve(name)
      await fsp.mkdir(path.dirname(target), { recursive: true })
      await fsp.appendFile(target, `${line}\n`, { encoding: 'utf8', mode: 0o600 })
    })
  }

  async listJson(directory) {
    try {
      const target = this.resolve(directory)
      const entries = await fsp.readdir(target, { withFileTypes: true })
      const out = []
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue
        const value = await this.readJson(path.join(directory, entry.name), null)
        if (value && typeof value === 'object') out.push({ name: entry.name, value })
      }
      return out
    } catch {
      return []
    }
  }

  async remove(name) {
    if (!this.ok) return false
    try {
      await fsp.unlink(this.resolve(name))
      return true
    } catch {
      return false
    }
  }

  async writeRaw(name, value) {
    await this.writeText(name, value)
  }
}

class AuditChain {
  constructor(store, config, logger) {
    this.store = store
    this.config = config
    this.logger = logger
    this.file = config.auditFile
    this.seq = 0
    this.prev = ''
    this.broken = false
    this.entries = []
    this.ready = this.init()
  }

  async init() {
    try {
      const text = await this.store.readText(this.file)
      if (!text) return
      const lines = text.split(/\r?\n/).filter(Boolean)
      let previous = ''
      let seq = 0
      for (const line of lines.slice(-this.config.auditMaxLines)) {
        const record = JSON.parse(line)
        if (!record || typeof record !== 'object') {
          this.broken = true
          continue
        }
        if (record.prev !== previous) this.broken = true
        const copy = { ...record }
        delete copy.hash
        const expected = sha256(`${previous}\0${stableStringify(copy)}`)
        if (record.hash !== expected) this.broken = true
        previous = asString(record.hash)
        seq = Math.max(seq, Math.trunc(finiteNumber(record.seq, 0)))
        this.entries.push(record)
      }
      this.prev = previous
      this.seq = seq
      while (this.entries.length > 1000) this.entries.shift()
      if (this.broken) this.logger.warn('audit hash chain verification found a discontinuity; new records continue the last hash')
    } catch (error) {
      this.broken = true
      this.logger.warn(`audit chain init failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async record(kind, subject, sessionId, reason, extra) {
    await this.ready
    const entry = {
      seq: this.seq + 1,
      at: isoTime(),
      kind: asString(kind, 'deny').slice(0, 32),
      subject: asString(subject, 'unknown').slice(0, 200),
      sessionId: asString(sessionId, '').slice(0, 200),
      reason: truncateCodePoints(redactSecrets(reason), 600),
      ...(extra === undefined ? {} : { extra: redactSecrets(safeJson(extra)).slice(0, 2000) }),
      prev: this.prev,
    }
    const hash = sha256(`${this.prev}\0${stableStringify(entry)}`)
    const record = { ...entry, hash }
    this.seq = entry.seq
    this.prev = hash
    this.entries.push(record)
    while (this.entries.length > 1000) this.entries.shift()
    try {
      await this.store.appendLine(this.file, stableStringify(record))
    } catch {
      this.broken = true
      // The in-memory chain remains readable in status; an unavailable disk
      // must not turn a security decision into an exception.
    }
    return record
  }

  snapshot() {
    return {
      seq: this.seq,
      broken: this.broken,
      lastHash: this.prev,
      recent: this.entries.slice(-12).map((entry) => ({
        seq: entry.seq,
        at: entry.at,
        kind: entry.kind,
        subject: entry.subject,
        reason: entry.reason,
      })),
    }
  }
}

class UsageLedger {
  constructor(store, config, logger) {
    this.store = store
    this.config = config
    this.logger = logger
    this.state = this.blankState()
    this.saveTimer = null
    this.ready = this.init()
  }

  blankState() {
    return {
      version: 1,
      monthKey: monthKey(),
      total: this.blankBucket(),
      month: {},
      sessions: {},
      updatedAt: 0,
    }
  }

  blankBucket() {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      officialCalls: 0,
      estimatedCalls: 0,
    }
  }

  async init() {
    try {
      const loaded = await this.store.readJson(USAGE_FILE, null)
      if (loaded && typeof loaded === 'object') {
        this.state = {
          version: 1,
          monthKey: asString(loaded.monthKey, monthKey()),
          total: this.normalizeBucket(loaded.total),
          month: isPlainObject(loaded.month) ? loaded.month : {},
          sessions: isPlainObject(loaded.sessions) ? loaded.sessions : {},
          updatedAt: finiteNumber(loaded.updatedAt, 0),
        }
      }
    } catch (error) {
      this.logger.warn(`usage ledger load failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    this.ensureMonth()
  }

  normalizeBucket(value) {
    const source = isPlainObject(value) ? value : {}
    const bucket = this.blankBucket()
    for (const key of Object.keys(bucket)) {
      if (key === 'costUsd') bucket[key] = Math.max(0, finiteNumber(source[key], 0))
      else bucket[key] = Math.max(0, Math.trunc(finiteNumber(source[key], 0)))
    }
    return bucket
  }

  ensureMonth() {
    const current = monthKey()
    if (this.state.monthKey === current) return
    this.state.monthKey = current
    this.state.month = {}
    this.scheduleSave()
  }

  price(provider, model, usage) {
    const exactKey = `${asString(provider, '*').toLowerCase()}/${asString(model, '*').toLowerCase()}`
    const pricing = this.config.pricing || {}
    let entry = pricing[exactKey]
    if (!entry) {
      const providerKey = `${asString(provider, '*').toLowerCase()}/*`
      entry = pricing[providerKey]
    }
    if (!entry) entry = pricing['*'] || DEFAULT_CONFIG.usage.pricing['*']
    const input = Math.max(0, finiteNumber(usage?.inputTokens, 0))
    const output = Math.max(0, finiteNumber(usage?.outputTokens, 0))
    const cacheRead = Math.max(0, finiteNumber(usage?.cacheReadTokens, 0))
    const cacheWrite = Math.max(0, finiteNumber(usage?.cacheWriteTokens, 0))
    const flash = exactKey.endsWith('/deepseek-flash')
    const multiplier = flash && isDeepSeekPeak() ? 2 : 1
    const costUsd = (
      input * finiteNumber(entry.input, 0) +
      output * finiteNumber(entry.output, 0) +
      cacheRead * finiteNumber(entry.cacheRead, 0) +
      cacheWrite * finiteNumber(entry.cacheWrite, 0)
    ) * multiplier / 1_000_000
    return round(costUsd, 8)
  }

  record({ sessionId, provider, model, usage, estimated, source }) {
    const normalized = normalizeTokenUsage(usage)
    if (!normalized) return null
    this.ensureMonth()
    const costUsd = this.price(provider, model, normalized)
    const add = (bucket) => {
      bucket.inputTokens += normalized.inputTokens
      bucket.outputTokens += normalized.outputTokens
      bucket.cacheReadTokens += normalized.cacheReadTokens
      bucket.cacheWriteTokens += normalized.cacheWriteTokens
      bucket.reasoningTokens += normalized.reasoningTokens
      bucket.totalTokens += normalized.totalTokens
      bucket.costUsd = round(bucket.costUsd + costUsd, 8)
      if (estimated) bucket.estimatedCalls += 1
      else bucket.officialCalls += 1
      return bucket
    }
    this.state.total = add(this.state.total)
    const providerKey = asString(provider, 'unknown')
    if (!this.state.month[providerKey]) this.state.month[providerKey] = this.blankBucket()
    this.state.month[providerKey] = add(this.state.month[providerKey])
    const key = asString(sessionId, 'unscoped')
    if (!this.state.sessions[key]) {
      this.state.sessions[key] = { ...this.blankBucket(), lastSeen: Date.now() }
    }
    this.state.sessions[key] = { ...add(this.state.sessions[key]), lastSeen: Date.now() }
    this.trimSessions()
    this.state.updatedAt = Date.now()
    this.scheduleSave()
    return {
      costUsd,
      usage: normalized,
      provider: providerKey,
      model: asString(model, ''),
      estimated: Boolean(estimated),
      source: asString(source, 'unknown'),
    }
  }

  trimSessions() {
    const entries = Object.entries(this.state.sessions)
    const limit = Math.max(1, Math.trunc(finiteNumber(this.config.maxSessions, 256)))
    if (entries.length <= limit) return
    entries.sort((left, right) => finiteNumber(left[1].lastSeen, 0) - finiteNumber(right[1].lastSeen, 0))
    for (const [key] of entries.slice(0, entries.length - limit)) delete this.state.sessions[key]
  }

  session(sessionId) {
    const bucket = this.state.sessions[asString(sessionId)] || this.blankBucket()
    return this.normalizeBucket(bucket)
  }

  monthFor(provider) {
    return this.normalizeBucket(this.state.month[asString(provider)] || {})
  }

  monthSpentFor(provider) {
    return this.monthFor(provider).costUsd
  }

  total() {
    return this.normalizeBucket(this.state.total)
  }

  scheduleSave() {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.flush()
    }, 800)
    if (typeof this.saveTimer.unref === 'function') this.saveTimer.unref()
  }

  async flush() {
    try {
      this.state.updatedAt = Date.now()
      await this.store.writeJson(USAGE_FILE, this.state)
    } catch (error) {
      this.logger.warn(`usage ledger save failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  snapshot() {
    return {
      monthKey: this.state.monthKey,
      total: this.normalizeBucket(this.state.total),
      month: Object.fromEntries(
        Object.entries(this.state.month).map(([key, value]) => [key, this.normalizeBucket(value)]),
      ),
      sessions: Object.keys(this.state.sessions).length,
      updatedAt: this.state.updatedAt,
    }
  }
}

class EvidenceIndex {
  constructor(config) {
    this.config = config
    this.bySession = new Map()
    this.calls = new Map()
    this.revision = 0
  }

  addCall({ sessionId, callId, name, argumentsValue }) {
    const sid = asString(sessionId)
    const id = asString(callId)
    if (!sid || !id) return
    this.calls.set(`${sid}\0${id}`, {
      name: asString(name, 'tool'),
      // Tool arguments are the highest-risk persistence point: a shell command
      // can contain a credential verbatim. Redact before the map or any later
      // evidence record can retain it.
      arguments: redactSecrets(asString(argumentsValue, '')),
      at: Date.now(),
    })
    while (this.calls.size > 4000) {
      const first = this.calls.keys().next()
      if (first.done) break
      this.calls.delete(first.value)
    }
  }

  addResult({ sessionId, callId, tool, argumentsValue, result }) {
    const sid = asString(sessionId)
    if (!sid) return null
    const call = this.calls.get(`${sid}\0${asString(callId)}`)
    const name = asString(tool, call?.name || 'tool')
    const argsText = redactSecrets(asString(argumentsValue, call?.arguments || ''))
    const output = resultText(result)
    const success = result && typeof result === 'object' ? result.isError !== true : true
    const level = this.classify(name, output, success)
    const params = collectAnchors(argsText).slice(0, 64)
    const anchors = collectAnchors(output).slice(0, 96)
    const summary = summarizeText(output || argsText, 180)
    if (!summary && params.length === 0 && anchors.length === 0) return null
    const record = {
      id: shortHash(`${sid}\0${asString(callId)}\0${name}\0${this.revision}`, 20),
      sessionId: sid,
      callId: asString(callId),
      tool: name,
      level,
      success,
      params,
      anchors,
      keywords: keywordsOf(`${argsText}\n${summary}`, 16),
      summary,
      at: Date.now(),
    }
    const list = this.bySession.get(sid) || []
    list.push(record)
    const limit = Math.max(1, Math.min(400, Math.trunc(finiteNumber(this.config.indexLimit, 400))))
    while (list.length > limit) list.shift()
    this.bySession.set(sid, list)
    this.trimGlobal()
    this.revision += 1
    return record
  }

  addDurable({ sessionId, callId, message, error, tool }) {
    const call = this.calls.get(`${asString(sessionId)}\0${asString(callId)}`)
    const result = {
      content: message?.content || [],
      isError: Boolean(error),
    }
    return this.addResult({
      sessionId,
      callId,
      tool: tool || call?.name || 'tool',
      argumentsValue: call?.arguments || '',
      result,
    })
  }

  classify(tool, output, success) {
    const name = asString(tool).toLowerCase()
    const value = asString(output).toLowerCase()
    if (!success) return 'prior_verified'
    if (TEST_TOOLS.has(name) || /(?:test|check|build|lint|typecheck|verify)/.test(name)) {
      if (/(?:passed|passing|success|0 failed|exit code 0|exit code: 0)/.test(value)) return 'tested'
    }
    if (/\b\d+(?:\.\d+)?\s*(?:ms|s|sec|MB|GB|KB|%|tokens?)\b/.test(value)) return 'measured'
    if (READ_TOOLS.has(name)) return 'read_directly'
    return 'prior_verified'
  }

  trimGlobal() {
    let total = 0
    for (const list of this.bySession.values()) total += list.length
    const limit = Math.max(400, Math.trunc(finiteNumber(this.config.globalIndexLimit, 4000)))
    if (total <= limit) return
    const oldest = [...this.bySession.entries()].sort(
      (left, right) => finiteNumber(left[1][0]?.at, 0) - finiteNumber(right[1][0]?.at, 0),
    )
    for (const [sid, list] of oldest) {
      if (total <= limit) break
      total -= list.length
      this.bySession.delete(sid)
    }
  }

  match(fact, sessionId) {
    const sid = asString(sessionId)
    const key = anchorKey(fact)
    const value = asString(fact.value).toLowerCase()
    const factsTokens = uniqueTokens(fact.value)
    const own = this.bySession.get(sid) || []
    for (const record of own) {
      if (record.params.some((anchor) => anchorKey(anchor) === key) ||
          record.anchors.some((anchor) => anchorKey(anchor) === key)) {
        return { level: record.level, record, match: 'exact-own' }
      }
    }
    for (const record of own) {
      const overlap = record.keywords.filter((token) => factsTokens.includes(token)).length
      if (overlap >= Math.max(1, Math.trunc(finiteNumber(this.config.ownKeywordMinOverlap, 1)))) {
        return { level: record.level, record, match: 'keyword-own' }
      }
    }
    for (const [otherSession, records] of this.bySession) {
      if (otherSession === sid) continue
      for (const record of records) {
        if (record.params.some((anchor) => anchorKey(anchor) === key) ||
            record.anchors.some((anchor) => anchorKey(anchor) === key)) {
          return { level: 'prior_verified', record, match: 'other-session' }
        }
      }
    }
    return null
  }

  query(sessionId, text, limit = 10) {
    const sid = asString(sessionId)
    const query = uniqueTokens(text)
    if (query.length === 0) return []
    const scored = []
    for (const [owner, records] of this.bySession) {
      for (const record of records) {
        let score = 0
        for (const token of query) {
          if (record.keywords.includes(token)) score += 2
          if (record.summary.toLowerCase().includes(token)) score += 1
        }
        if (owner === sid) score += 1
        if (score > 0) scored.push({ score, record })
      }
    }
    scored.sort((left, right) => right.score - left.score || right.record.at - left.record.at)
    return scored.slice(0, Math.max(1, Math.min(50, limit))).map(({ score, record }) => ({
      id: record.id,
      sessionId: record.sessionId,
      tool: record.tool,
      level: record.level,
      summary: record.summary,
      anchors: [...record.params, ...record.anchors].slice(0, 12),
      score,
    }))
  }

  counts() {
    let sessions = 0
    let records = 0
    for (const list of this.bySession.values()) {
      sessions += list.length > 0 ? 1 : 0
      records += list.length
    }
    return { sessions, records, revision: this.revision }
  }

  serialize() {
    return {
      version: 1,
      calls: [...this.calls.entries()].slice(-2000).map(([key, value]) => [key, value]),
      sessions: [...this.bySession.entries()].map(([sid, records]) => [sid, records.slice(-this.config.indexLimit)]),
    }
  }

  hydrate(value) {
    try {
      if (!value || typeof value !== 'object') return
      if (Array.isArray(value.calls)) {
        for (const pair of value.calls) {
          if (Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string') {
            const entry = pair[1] && typeof pair[1] === 'object' ? pair[1] : {}
            this.calls.set(pair[0], {
              ...entry,
              arguments: redactSecrets(asString(entry.arguments, '')),
            })
          }
        }
      }
      if (Array.isArray(value.sessions)) {
        for (const pair of value.sessions) {
          if (!Array.isArray(pair) || pair.length !== 2 || !Array.isArray(pair[1])) continue
          this.bySession.set(String(pair[0]), pair[1].slice(-this.config.indexLimit))
        }
      }
      this.revision += 1
    } catch {
      // Derived evidence is disposable; malformed persisted data is ignored.
    }
  }
}

class SkillStore {
  constructor(store, config, logger) {
    this.store = store
    this.config = config
    this.logger = logger
    this.reviewTimer = null
    this.reviewing = false
    this.lastReview = null
  }

  async init() {
    try {
      await this.store.init(['skills', 'skills/staged', 'skills/promoted', 'skills/rejected'])
    } catch {
      // The store already degrades; skill operations report the store state.
    }
  }

  async list(kind = 'all') {
    const directories = kind === 'all' ? ['skills/staged', 'skills/promoted', 'skills/rejected'] : [`skills/${kind}`]
    const out = []
    for (const directory of directories) {
      const entries = await this.store.listJson(directory)
      for (const entry of entries) {
        const value = entry.value || {}
        out.push({
          id: asString(value.id, entry.name.replace(/\.json$/, '')),
          name: asString(value.name, ''),
          stage: asString(value.stage, directory.split('/').pop() || 'staged'),
          tags: Array.isArray(value.tags) ? value.tags.slice(0, 32) : [],
          bytes: Buffer.byteLength(asString(value.content, ''), 'utf8'),
          createdAt: finiteNumber(value.createdAt, 0),
          promotedAt: finiteNumber(value.promotedAt, 0),
          sourceSession: asString(value.sourceSession, ''),
          review: value.review || null,
        })
      }
    }
    out.sort((left, right) => right.createdAt - left.createdAt || left.name.localeCompare(right.name))
    return out
  }

  async counts() {
    const [staged, promoted, rejected] = await Promise.all([
      this.store.listJson('skills/staged'),
      this.store.listJson('skills/promoted'),
      this.store.listJson('skills/rejected'),
    ])
    return { staged: staged.length, promoted: promoted.length, rejected: rejected.length }
  }

  async stage({ name, content, tags, sourceSession }) {
    const cleanName = asString(name).trim()
    if (!/^[A-Za-z0-9][A-Za-z0-9._ -]{2,63}$/.test(cleanName)) {
      throw new Error('skill name must be 3-64 characters: letters, digits, dot, dash, underscore, space')
    }
    const cleanContent = asString(content)
    if (cleanContent.trim().length < this.config.minContentChars) {
      throw new Error(`skill content must be at least ${this.config.minContentChars} characters`)
    }
    if (Buffer.byteLength(cleanContent, 'utf8') > this.config.maxContentBytes) {
      throw new Error(`skill content exceeds ${this.config.maxContentBytes} bytes`)
    }
    if (redactSecrets(cleanContent) !== cleanContent) throw new Error('skill content contains a possible secret')
    const staged = await this.store.listJson('skills/staged')
    if (staged.length >= this.config.maxStaged) throw new Error(`staged skill limit (${this.config.maxStaged}) reached`)
    const id = shortHash(`${cleanName}\0${cleanContent}`, 20)
    const existing = await this.store.readJson(`skills/staged/${id}.json`, null)
    if (existing) return { ...existing, existed: true }
    const record = {
      version: 1,
      id,
      name: cleanName,
      content: cleanContent,
      tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string').slice(0, 32) : [],
      stage: 'staged',
      sourceSession: asString(sourceSession),
      createdAt: Date.now(),
    }
    await this.store.writeJson(`skills/staged/${id}.json`, record)
    return { ...record, existed: false }
  }

  scheduleReview(reason, delay) {
    if (this.reviewing) return false
    if (this.reviewTimer) return true
    const wait = Math.max(0, Math.trunc(finiteNumber(delay, this.config.reviewDelayMs)))
    this.reviewTimer = setTimeout(() => {
      this.reviewTimer = null
      void this.reviewStaged(reason)
    }, wait)
    if (typeof this.reviewTimer.unref === 'function') this.reviewTimer.unref()
    return true
  }

  validate(record) {
    const content = asString(record.content)
    if (content.trim().length < this.config.minContentChars) return 'content too short'
    if (Buffer.byteLength(content, 'utf8') > this.config.maxContentBytes) return 'content too large'
    if (redactSecrets(content) !== content) return 'possible secret in content'
    const upper = content.toUpperCase()
    for (const marker of this.config.rejectMarkers) {
      if (upper.includes(asString(marker).toUpperCase())) return `contains forbidden marker ${marker}`
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._ -]{2,63}$/.test(asString(record.name))) return 'invalid name'
    return ''
  }

  async reviewStaged(reason = 'idle') {
    if (this.reviewing) return this.lastReview
    this.reviewing = true
    let promoted = 0
    let rejected = 0
    try {
      const entries = await this.store.listJson('skills/staged')
      for (const entry of entries) {
        const record = entry.value
        if (!record || typeof record !== 'object') continue
        const problem = this.validate(record)
        if (problem) {
          await this.store.writeJson(`skills/rejected/${entry.name}`, {
            ...record,
            stage: 'rejected',
            rejectedAt: Date.now(),
            review: { ok: false, reason: problem, trigger: asString(reason) },
          })
          await this.store.remove(`skills/staged/${entry.name}`)
          rejected += 1
          continue
        }
        const promotedRecord = {
          ...record,
          stage: 'promoted',
          promotedAt: Date.now(),
          review: {
            ok: true,
            trigger: asString(reason),
            checks: ['non-empty', 'bounded', 'no-secret', 'no-placeholder-marker', 'valid-name'],
          },
        }
        await this.store.writeJson(`skills/promoted/${entry.name}`, promotedRecord)
        await this.store.remove(`skills/staged/${entry.name}`)
        promoted += 1
      }
      this.lastReview = { at: Date.now(), promoted, rejected, trigger: asString(reason) }
      return this.lastReview
    } catch (error) {
      this.logger.warn(`skill review failed: ${error instanceof Error ? error.message : String(error)}`)
      this.lastReview = {
        at: Date.now(),
        promoted,
        rejected,
        trigger: asString(reason),
        error: error instanceof Error ? error.message : String(error),
      }
      return this.lastReview
    } finally {
      this.reviewing = false
    }
  }
}

class FederationArbiter {
  constructor(config, logger) {
    this.config = config
    this.logger = logger
    this.handlers = new Map()
    this.jepa = new JepaWorldModel()
    this.cuv = new CuvScorer()
    this.mpRcp = new MpRcpArbiter()
  }

  register(kind, handler) {
    if (!['jepa', 'cuv', 'mpRcp'].includes(kind) || typeof handler !== 'function') {
      throw new Error('federation arbiter accepts jepa, cuv, or mpRcp with a function')
    }
    this.handlers.set(kind, handler)
    return () => this.handlers.delete(kind)
  }

  async evaluate(kind, action, context) {
    const config = this.config[kind]
    if (!config || !config.enabled) return { decision: 'allow', reason: 'disabled' }
    if (config.allow && !config.blocking) {
      const defaultResult = kind === 'jepa'
        ? this.jepa.evaluate(action, context)
        : kind === 'cuv'
          ? this.cuv.evaluate(action, context)
          : this.mpRcp.evaluate(action, context)
      const handler = this.handlers.get(kind)
      if (!handler) return { ...defaultResult, decision: 'allow', reason: 'default-allow' }
      const outcome = await withTimeout(Promise.resolve().then(() => handler(action, context)), config.timeoutMs)
      if (outcome.timedOut) return { ...defaultResult, decision: 'allow', reason: 'timeout-default-allow' }
      if (outcome.error) {
        this.logger.warn(`federation ${kind} handler failed: ${outcome.error.message || outcome.error}`)
        return { ...defaultResult, decision: 'allow', reason: 'error-default-allow' }
      }
      const value = outcome.value
      const deny = value && typeof value === 'object' && value.decision === 'deny'
      return {
        ...defaultResult,
        ...(value && typeof value === 'object' ? value : { value }),
        decision: deny && config.blocking ? 'deny' : 'allow',
        reason: deny && !config.blocking ? 'advisory-deny-default-allow' : asString(value?.reason, 'allow'),
      }
    }
    const handler = this.handlers.get(kind)
    if (!handler) return { decision: 'allow', reason: 'no-handler' }
    const outcome = await withTimeout(Promise.resolve().then(() => handler(action, context)), config.timeoutMs)
    if (outcome.timedOut) return { decision: 'allow', reason: 'timeout-default-allow' }
    if (outcome.error) return { decision: 'allow', reason: 'error-default-allow' }
    return {
      decision: outcome.value?.decision === 'deny' ? 'deny' : 'allow',
      reason: asString(outcome.value?.reason, 'allow'),
      detail: outcome.value,
    }
  }

  async arbitrate(action, context) {
    const out = {}
    for (const kind of ['jepa', 'cuv', 'mpRcp']) {
      out[kind] = await this.evaluate(kind, action, context)
    }
    return out
  }

  snapshot() {
    const out = {}
    for (const kind of ['jepa', 'cuv', 'mpRcp']) {
      out[kind] = {
        enabled: Boolean(this.config[kind]?.enabled),
        allow: Boolean(this.config[kind]?.allow),
        blocking: Boolean(this.config[kind]?.blocking),
        handler: this.handlers.has(kind),
      }
    }
    return out
  }
}

class JepaWorldModel {
  embed(text) {
    const vector = new Array(16).fill(0)
    const tokens = tokenize(text)
    for (const token of tokens) {
      const digest = createHash('sha256').update(token).digest()
      for (let index = 0; index < vector.length; index += 1) {
        const byte = digest[index]
        vector[index] += byte % 2 === 0 ? 1 : -1
      }
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
    return vector.map((value) => round(value / norm, 6))
  }

  evaluate(action, context) {
    const text = `${asString(action)} ${safeJson(context || {})}`
    const embedding = this.embed(text)
    const energy = embedding.reduce((sum, value) => sum + Math.abs(value), 0) / embedding.length
    return {
      decision: 'allow',
      confidence: round(Math.min(0.99, 1 - energy / 2), 4),
      risk: round(Math.min(1, energy), 4),
      model: 'jepa-hash-v1',
    }
  }
}

class CuvScorer {
  evaluate(action, context) {
    const text = `${asString(action)} ${safeJson(context || {})}`.toLowerCase()
    const conflict = /(?:conflict|contradict|矛盾|冲突)/.test(text) ? 0.7 : 0.05
    const uncertainty = /(?:unknown|maybe|perhaps|不确定|可能)/.test(text) ? 0.6 : 0.1
    const value = /(?:must|critical|security|blocker|必须|关键|安全)/.test(text) ? 0.9 : 0.5
    return {
      decision: 'allow',
      value: round(value, 4),
      conflict: round(conflict, 4),
      uncertainty: round(uncertainty, 4),
      model: 'cuv-v1',
    }
  }
}

class MpRcpArbiter {
  evaluate(action, context) {
    const peers = Array.isArray(context?.peers) ? context.peers.length : 1
    return {
      decision: 'allow',
      quorum: Math.min(peers, 1),
      votes: { allow: peers, deny: 0 },
      model: 'mp-rcp-v1',
      action: asString(action),
    }
  }
}

// ---------------------------------------------------------------------------
// Floating window: served from the Host so the four-file bundle keeps a
// dependency-free Client surface. It reads only the Host memory cache.
// ---------------------------------------------------------------------------

const UI_CLIENT_JS = String.raw`
(function () {
  'use strict';
  var CFG = window.__AGI_FED_UI__ || {};
  try {
    var current = document.currentScript;
    if (current && current.src) {
      var params = new URL(current.src).searchParams;
      CFG = {
        pollIntervalMs: Number(params.get('poll') || CFG.pollIntervalMs),
        startCollapsed: (params.get('collapsed') || '') === '1' || !!CFG.startCollapsed,
        position: params.get('position') || CFG.position
      };
    }
  } catch (e) {}
  var rootId = 'dsh-agi-federated-float';
  if (document.getElementById(rootId)) return;
  try { if (sessionStorage.getItem('dsh-agi-fed-hidden') === '1') return; } catch (e) {}
  var pollMs = Math.max(500, Number(CFG.pollIntervalMs) || 2000);
  var state = { data: null, timer: null, dragging: false, dx: 0, dy: 0, collapsed: !!CFG.startCollapsed };

  var style = document.createElement('style');
  style.setAttribute('data-plugin', 'dsh-agi-federated');
  style.textContent = [
    '.agif{position:fixed;z-index:2147483000;width:312px;box-sizing:border-box;',
    'font:12px/1.45 var(--dsw-font-sans,system-ui,-apple-system,Segoe UI,sans-serif);',
    'color:var(--dsw-alias-label-primary,#e8e8e8);background:var(--dsw-alias-bg-overlay,#202124);',
    'border:1px solid var(--dsw-alias-border-l2,#4a4d52);border-radius:12px;',
    'box-shadow:0 12px 32px rgba(0,0,0,.32);overflow:hidden;user-select:none;',
    'backdrop-filter:blur(8px);}',
    '.agif[data-pos="bottom-right"]{right:18px;bottom:18px}.agif[data-pos="bottom-left"]{left:18px;bottom:18px}',
    '.agif[data-pos="top-right"]{right:18px;top:18px}.agif[data-pos="top-left"]{left:18px;top:18px}',
    '.agif-head{display:flex;align-items:center;gap:8px;padding:9px 10px;cursor:move;',
    'background:var(--dsw-alias-bg-layer-2,#2a2d31);border-bottom:1px solid var(--dsw-alias-border-l1,#3a3d42)}',
    '.agif-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary,#777);flex:0 0 auto}',
    '.agif-dot.live{background:var(--dsw-alias-state-success-primary,#2ecc71);box-shadow:0 0 0 3px rgba(46,204,113,.16)}',
    '.agif-title{font-weight:650;font-size:12px;letter-spacing:.02em;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.agif-btn{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#aaa);cursor:pointer;',
    'font:inherit;padding:2px 5px;border-radius:5px;line-height:1.2}',
    '.agif-btn:hover{background:var(--dsw-alias-bg-layer-1,#333);color:var(--dsw-alias-label-primary,#fff)}',
    '.agif-body{padding:9px 10px 10px;display:grid;gap:7px;max-height:66vh;overflow:auto;user-select:text}',
    '.agif-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
    '.agif-label{color:var(--dsw-alias-label-secondary,#aaa);font-size:11px}',
    '.agif-value{font-variant-numeric:tabular-nums;text-align:right;word-break:break-all}',
    '.agif-section{border-top:1px solid var(--dsw-alias-border-l1,#3a3d42);padding-top:7px;margin-top:1px}',
    '.agif-provider{display:grid;gap:3px;padding:5px 0;border-bottom:1px dashed var(--dsw-alias-border-l1,#3a3d42)}',
    '.agif-provider:last-child{border-bottom:0}',
    '.agif-bar{height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2,#2a2d31);overflow:hidden}',
    '.agif-bar > span{display:block;height:100%;width:0;background:var(--dsw-alias-brand-primary,#4c9aff)}',
    '.agif-warn{color:var(--dsw-alias-state-warn-primary,#f0b429)}',
    '.agif-err{color:var(--dsw-alias-state-error-primary,#f15b5b)}',
    '.agif-muted{color:var(--dsw-alias-label-secondary,#999);font-size:10px}',
    '.agif.collapsed .agif-body{display:none}',
    '.agif.collapsed .agif-head{border-bottom:0}',
    '@media (max-width:640px){.agif{width:calc(100vw - 24px);right:12px;left:12px;bottom:12px}}'
  ].join('');
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = rootId;
  root.className = 'agif';
  root.dataset.pos = CFG.position || 'bottom-right';
  root.setAttribute('role', 'complementary');
  root.setAttribute('aria-label', 'AGI Federated status');

  var head = document.createElement('div');
  head.className = 'agif-head';
  var dot = document.createElement('span');
  dot.className = 'agif-dot';
  var title = document.createElement('span');
  title.className = 'agif-title';
  title.textContent = 'AGI FEDERATED';
  var collapse = document.createElement('button');
  collapse.className = 'agif-btn';
  collapse.type = 'button';
  collapse.textContent = '–';
  collapse.title = 'Collapse';
  collapse.setAttribute('aria-label', 'Collapse AGI Federated status');
  var close = document.createElement('button');
  close.className = 'agif-btn';
  close.type = 'button';
  close.textContent = '×';
  close.title = 'Hide';
  close.setAttribute('aria-label', 'Hide AGI Federated status');
  head.appendChild(dot);
  head.appendChild(title);
  head.appendChild(collapse);
  head.appendChild(close);

  var body = document.createElement('div');
  body.className = 'agif-body';
  root.appendChild(head);
  root.appendChild(body);
  document.body.appendChild(root);

  function elem(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function row(label, value, cls) {
    var wrap = elem('div', 'agif-row');
    wrap.appendChild(elem('span', 'agif-label', label));
    wrap.appendChild(elem('span', 'agif-value' + (cls ? ' ' + cls : ''), value));
    return wrap;
  }
  function section(label) {
    var wrap = elem('div', 'agif-section');
    wrap.appendChild(elem('div', 'agif-muted', label));
    return wrap;
  }
  function num(value) {
    var n = Number(value) || 0;
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(Math.round(n));
  }
  function money(value) {
    var n = Number(value) || 0;
    return '$' + n.toFixed(n >= 1 ? 2 : 4);
  }
  function remaining(ms) {
    var s = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
    if (s >= 3600) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
    if (s >= 60) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    return s + 's';
  }
  function sid() {
    try {
      var q = new URLSearchParams(location.search);
      var direct = q.get('sessionId') || q.get('session');
      if (direct) return direct;
      var m = location.pathname.match(/(?:sessions?|conversation)\/([^/?#]+)/i);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }
  function updateDot(live) {
    dot.className = 'agif-dot' + (live ? ' live' : '');
    dot.title = live ? 'streaming' : 'idle';
  }
  function render(data) {
    state.data = data;
    state.countdowns = [];
    updateDot(Boolean(data.streaming && data.streaming.active));
    body.replaceChildren();
    var model = data.model || {};
    body.appendChild(row('model', (model.provider || '—') + ' / ' + (model.model || '—')));
    var session = data.session || {};
    body.appendChild(row('session tokens', num(session.totalTokens)));
    body.appendChild(row('context', num(session.contextTokens) + (session.contextWindow ? ' / ' + num(session.contextWindow) : '')));
    body.appendChild(row('session cost', money(data.cost && data.cost.sessionUsd)));
    body.appendChild(row('month cost', money(data.cost && data.cost.monthUsd)));
    body.appendChild(row('total cost', money(data.cost && data.cost.totalUsd)));
    if (data.streaming && data.streaming.active) {
      body.appendChild(row('streaming', '~' + num(data.streaming.estimatedOutputTokens) + ' tokens', 'agif-warn'));
    }
    var providers = Array.isArray(data.providers) ? data.providers : [];
    var prov = section('PROVIDERS');
    if (providers.length === 0) prov.appendChild(elem('div', 'agif-muted', 'no provider route'));
    for (var i = 0; i < providers.length; i += 1) {
      var p = providers[i] || {};
      var card = elem('div', 'agif-provider');
      var top = elem('div', 'agif-row');
      top.appendChild(elem('span', 'agif-value', p.label || p.id || 'provider'));
      var balance = p.balance === null || p.balance === undefined ? 'spendOnly' : (p.balance + ' ' + (p.currency || ''));
      top.appendChild(elem('span', 'agif-value', balance));
      card.appendChild(top);
      var mid = elem('div', 'agif-row');
      mid.appendChild(elem('span', 'agif-label', 'month / budget'));
      mid.appendChild(elem('span', 'agif-value', money(p.monthUsd) + (p.budgetUsd > 0 ? ' / ' + money(p.budgetUsd) : '')));
      card.appendChild(mid);
      if (p.budgetUsd > 0) {
        var bar = elem('div', 'agif-bar');
        var fill = document.createElement('span');
        fill.style.width = Math.max(0, Math.min(100, (Number(p.monthUsd) / Number(p.budgetUsd)) * 100)) + '%';
        bar.appendChild(fill);
        card.appendChild(bar);
      }
      if (p.breakerRemainingMs > 0) {
        var breaker = elem('div', 'agif-muted agif-err', 'breaker ' + remaining(p.breakerRemainingMs));
        breaker.dataset.until = String(Date.now() + Number(p.breakerRemainingMs));
        state.countdowns.push(breaker);
        card.appendChild(breaker);
      } else if (p.status && p.status !== 'ok') {
        card.appendChild(elem('div', 'agif-muted agif-warn', String(p.status)));
      }
      prov.appendChild(card);
    }
    body.appendChild(prov);
    var ev = data.evidence || {};
    var sk = data.skills || {};
    var aux = section('EVIDENCE / SKILLS');
    aux.appendChild(row('evidence', num(ev.records) + ' / ' + num(ev.sessions) + ' sessions'));
    aux.appendChild(row('skills', num(sk.staged) + ' staged · ' + num(sk.promoted) + ' promoted'));
    var fed = data.federation || {};
    aux.appendChild(row('federation', 'jepa ' + (fed.jepa ? fed.jepa.decision || 'allow' : 'off') + ' · cuv ' + (fed.cuv ? fed.cuv.decision || 'allow' : 'off') + ' · mp-rcp ' + (fed.mpRcp ? fed.mpRcp.decision || 'allow' : 'off')));
    body.appendChild(aux);
    var footer = section('RUNTIME');
    footer.appendChild(row('compat', data.compat && data.compat.status ? data.compat.status : 'unknown'));
    footer.appendChild(row('audit', data.audit && data.audit.seq !== undefined ? String(data.audit.seq) : '—'));
    if (data.degraded) footer.appendChild(elem('div', 'agif-muted agif-err', 'persistence degraded: ' + (data.degradedReason || 'unavailable')));
    body.appendChild(footer);
  }
  async function poll() {
    try {
      var query = sid();
      var response = await fetch('/agi-federated/status' + (query ? '?sessionId=' + encodeURIComponent(query) : ''), { cache: 'no-store' });
      if (!response.ok) throw new Error('status ' + response.status);
      render(await response.json());
    } catch (error) {
      updateDot(false);
      state.countdowns = [];
      body.replaceChildren();
      body.appendChild(elem('div', 'agif-muted agif-err', 'status unavailable'));
      body.appendChild(elem('div', 'agif-muted', String(error && error.message ? error.message : error)));
    }
  }
  function savePos() {
    try {
      var rect = root.getBoundingClientRect();
      localStorage.setItem('dsh-agi-fed-pos', JSON.stringify({ left: rect.left, top: rect.top, pos: 'free' }));
    } catch (e) {}
  }
  function restorePos() {
    try {
      var raw = localStorage.getItem('dsh-agi-fed-pos');
      if (!raw) return;
      var value = JSON.parse(raw);
      if (!value || typeof value.left !== 'number' || typeof value.top !== 'number') return;
      root.dataset.pos = 'free';
      root.style.left = Math.max(8, Math.min(window.innerWidth - 120, value.left)) + 'px';
      root.style.top = Math.max(8, Math.min(window.innerHeight - 60, value.top)) + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    } catch (e) {}
  }
  function toggle() {
    state.collapsed = !state.collapsed;
    root.classList.toggle('collapsed', state.collapsed);
    collapse.textContent = state.collapsed ? '+' : '–';
  }
  collapse.addEventListener('click', toggle);
  close.addEventListener('click', function () {
    try { sessionStorage.setItem('dsh-agi-fed-hidden', '1'); } catch (e) {}
    root.remove();
  });
  head.addEventListener('pointerdown', function (event) {
    if (event.target === collapse || event.target === close) return;
    var rect = root.getBoundingClientRect();
    state.dragging = true;
    state.dx = event.clientX - rect.left;
    state.dy = event.clientY - rect.top;
    root.dataset.pos = 'free';
    root.style.left = rect.left + 'px';
    root.style.top = rect.top + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    head.setPointerCapture(event.pointerId);
  });
  head.addEventListener('pointermove', function (event) {
    if (!state.dragging) return;
    var left = Math.max(8, Math.min(window.innerWidth - 120, event.clientX - state.dx));
    var top = Math.max(8, Math.min(window.innerHeight - 60, event.clientY - state.dy));
    root.style.left = left + 'px';
    root.style.top = top + 'px';
  });
  head.addEventListener('pointerup', function () { if (state.dragging) { state.dragging = false; savePos(); } });
  head.addEventListener('pointercancel', function () { state.dragging = false; });
  restorePos();
  if (state.collapsed) { root.classList.add('collapsed'); collapse.textContent = '+'; }
  poll();
  state.timer = setInterval(poll, pollMs);
  state.countdownTimer = setInterval(function () {
    if (!state.countdowns || state.countdowns.length === 0) return;
    for (var c = 0; c < state.countdowns.length; c += 1) {
      var node = state.countdowns[c];
      var until = Number(node.dataset.until) || 0;
      var left = Math.max(0, until - Date.now());
      node.textContent = left > 0 ? 'breaker ' + remaining(left) : 'breaker cooling...';
    }
  }, 250);
  window.addEventListener('beforeunload', function () {
    if (state.timer) clearInterval(state.timer);
    if (state.countdownTimer) clearInterval(state.countdownTimer);
  }, { once: true });
})();
`

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

class AgiFederated {
  constructor(ctx, rawConfig) {
    this.ctx = ctx
    this.config = normalizeConfig(rawConfig)
    this.configCheck = validateConfig(rawConfig)
    this.log = {
      info: (message) => this.safeLog('info', message),
      warn: (message) => this.safeLog('warn', message),
      error: (message) => this.safeLog('error', message),
    }
    this.store = new JsonStore(this.config.dataDir, this.log)
    this.audit = new AuditChain(this.store, this.config.security, this.log)
    this.usage = new UsageLedger(this.store, this.config.usage, this.log)
    this.skills = new SkillStore(this.store, this.config.skills, this.log)
    this.evidence = new EvidenceIndex(this.config.evidence)
    this.federation = new FederationArbiter(this.config.federation, this.log)
    this.memory = {
      sessions: new Map(),
      clues: new Map(),
      lastQuery: new Map(),
      revision: 0,
    }
    this.hotCache = new Map()
    this.nodeTurns = new Map()
    this.agentSections = new Map()
    this.agentCleanups = new Map()
    this.streams = new Map()
    this.stepStreams = new Map()
    this.pendingRawUsage = new Map()
    this.providerStates = new Map()
    this.lastSessionId = ''
    this.lastModel = { provider: '', model: '' }
    this.sessionModels = new Map()
    this.lastTool = null
    this.lastSettlement = null
    this.lastBalanceRefresh = 0
    this.refreshingBalances = false
    this.compat = { status: 'unknown', hostVersion: '', warnings: [] }
    this.degraded = false
    this.degradedReason = ''
    this.disposed = false
    this.memorySaveTimer = null
    this.evidenceSaveTimer = null
    this.checkpointSaveTimer = null
    this.compactTimers = new Map()
    this.checkpoints = new Map()
    this.ready = this.init()
    void this.ready.catch((error) => {
      this.degraded = true
      this.degradedReason = error instanceof Error ? error.message : String(error)
      this.log.warn(`init failed: ${this.degradedReason}`)
    })
  }

  safeLog(level, message) {
    try {
      const logger = this.ctx?.logger
      const method = logger && typeof logger[level] === 'function' ? logger[level] : null
      if (method) method.call(logger, `[${PLUGIN_ID}] ${message}`)
    } catch {
      // Logging must never become a failure path.
    }
  }

  async init() {
    const ok = await this.store.init([
      'skills',
      'skills/staged',
      'skills/promoted',
      'skills/rejected',
      'evidence',
    ])
    this.degraded = !ok
    this.degradedReason = ok ? '' : this.store.error
    await Promise.all([this.audit.ready, this.usage.ready, this.skills.init()])
    await this.loadMemory()
    await this.loadCheckpoints()
    await this.loadEvidence()
    await this.checkCompat()
    void this.refreshBalances()
    this.startBalanceTimer()
  }

  async loadMemory() {
    try {
      const data = await this.store.readJson(MEMORY_FILE, null)
      if (!data || typeof data !== 'object') return
      if (isPlainObject(data.sessions)) {
        for (const [sid, records] of Object.entries(data.sessions)) {
          if (!Array.isArray(records)) continue
          this.memory.sessions.set(String(sid), records.slice(-64).map((record) => {
            if (!record || typeof record !== 'object' || typeof record.summary !== 'string') return null
            if (isCheckpointText(record.summary)) return null
            return {
              id: asString(record.id, `m-${shortHash(`${sid}\0${record.seq}\0${record.summary}`, 20)}`),
              sessionId: String(sid),
              kind: asString(record.kind, 'intent'),
              summary: asString(record.summary),
              keywords: Array.isArray(record.keywords) ? record.keywords.filter((item) => typeof item === 'string').slice(0, 24) : [],
              seedTokens: Array.isArray(record.seedTokens) ? record.seedTokens.filter((item) => typeof item === 'string').slice(0, 32) : [],
              anchors: Array.isArray(record.anchors) ? record.anchors.slice(0, 32) : [],
              importance: Math.max(0, Math.min(10, Math.trunc(finiteNumber(record.importance, 3)))),
              seq: Math.max(0, Math.trunc(finiteNumber(record.seq, 0))),
              at: Math.max(0, Math.trunc(finiteNumber(record.at, 0))),
            }
          }).filter(Boolean))
        }
      }
      if (Array.isArray(data.clues)) {
        for (const clue of data.clues.slice(-this.config.memory.clueMaxItems)) {
          if (clue && typeof clue === 'object' && typeof clue.id === 'string') {
            this.memory.clues.set(clue.id, clue)
          }
        }
      }
      this.memory.revision = Math.max(1, Math.trunc(finiteNumber(data.revision, 1)))
    } catch (error) {
      this.log.warn(`memory load failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async loadCheckpoints() {
    try {
      const data = await this.store.readJson(CHECKPOINT_FILE, null)
      if (isPlainObject(data?.checkpoints)) {
        for (const [sid, value] of Object.entries(data.checkpoints)) {
          if (value && typeof value === 'object') this.checkpoints.set(String(sid), value)
        }
      }
    } catch {
      // Checkpoints are an optimization; absence is harmless.
    }
  }

  async loadEvidence() {
    try {
      const data = await this.store.readJson(EVIDENCE_FILE, null)
      this.evidence.hydrate(data)
    } catch {
      // Evidence is derived and disposable.
    }
  }

  scheduleMemorySave() {
    if (this.memorySaveTimer || this.disposed) return
    this.memorySaveTimer = setTimeout(() => {
      this.memorySaveTimer = null
      void this.saveMemory()
    }, this.config.memory.persistDebounceMs)
    if (typeof this.memorySaveTimer.unref === 'function') this.memorySaveTimer.unref()
  }

  async saveMemory() {
    try {
      const sessions = {}
      for (const [sid, records] of this.memory.sessions) sessions[sid] = records.slice(-64)
      const clues = [...this.memory.clues.values()].slice(-this.config.memory.clueMaxItems)
      await this.store.writeJson(MEMORY_FILE, {
        version: 1,
        revision: this.memory.revision,
        sessions,
        clues,
      })
    } catch (error) {
      this.log.warn(`memory save failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  scheduleEvidenceSave() {
    if (this.evidenceSaveTimer || this.disposed) return
    this.evidenceSaveTimer = setTimeout(() => {
      this.evidenceSaveTimer = null
      void this.saveEvidence()
    }, 1000)
    if (typeof this.evidenceSaveTimer.unref === 'function') this.evidenceSaveTimer.unref()
  }

  async saveEvidence() {
    try {
      await this.store.writeJson(EVIDENCE_FILE, this.evidence.serialize())
    } catch {
      // Derived index; persistence failure is non-fatal.
    }
  }

  scheduleCheckpointSave() {
    if (this.checkpointSaveTimer || this.disposed) return
    this.checkpointSaveTimer = setTimeout(() => {
      this.checkpointSaveTimer = null
      void this.saveCheckpoints()
    }, 900)
    if (typeof this.checkpointSaveTimer.unref === 'function') this.checkpointSaveTimer.unref()
  }

  async saveCheckpoints() {
    try {
      await this.store.writeJson(CHECKPOINT_FILE, {
        version: 1,
        checkpoints: Object.fromEntries(this.checkpoints),
      })
    } catch {
      // Checkpoint metadata is advisory.
    }
  }

  on(name, handler) {
    try {
      const fn = typeof this.ctx?.on === 'function' ? this.ctx.on.bind(this.ctx) : null
      if (!fn) return
      fn(name, handler)
    } catch (error) {
      this.log.warn(`listener ${name} registration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  register() {
    this.registerPromptSections()
    this.registerEvents()
    this.registerTools()
    this.registerCommand()
    this.registerUi()
    try {
      if (typeof this.ctx?.effect === 'function') {
        this.ctx.effect(() => {
          return () => {
            void this.dispose()
          }
        })
      }
    } catch (error) {
      this.log.warn(`lifecycle registration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  registerPromptSections() {
    const systemPrompt = this.ctx?.get?.('systemPrompt')
    if (!systemPrompt || typeof systemPrompt.section !== 'function') return
    try {
      if (this.config.evidence.enabled && this.config.evidence.prompt) {
        systemPrompt.section({ name: `${PLUGIN_ID}.evidence`, order: 69, text: EVIDENCE_PROMPT })
      }
      const enabledSeam = ['jepa', 'cuv', 'mpRcp'].some((kind) => this.config.federation[kind].enabled)
      if (enabledSeam) {
        systemPrompt.section({ name: `${PLUGIN_ID}.federation`, order: 70, text: FEDERATION_PROMPT })
      }
    } catch (error) {
      this.log.warn(`prompt section registration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  registerEvents() {
    this.on('agent/created', async (payload) => {
      try {
        await this.handleAgentCreated(payload?.agent)
      } catch (error) {
        this.log.warn(`agent/created failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    this.on('agent/disposed', (payload) => {
      try {
        this.handleAgentDisposed(payload?.agent)
      } catch (error) {
        this.log.warn(`agent/disposed failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    this.on('agent/status', (payload) => {
      try {
        if (payload?.status === 'idle') {
          this.scheduleSkillReview('idle')
          void this.usage.flush()
          const sid = String(payload?.agent?.id || '')
          if (sid) this.scheduleCompact(sid)
        }
      } catch (error) {
        this.log.warn(`agent/status failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    this.on('agent/assistant-stream', (payload) => {
      try {
        this.handleStreamFrame(payload)
      } catch (error) {
        this.log.warn(`assistant-stream failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    this.on('agent/request', async (payload, next) => {
      const config = await next()
      try {
        const sid = payload?.agent?.id ? String(payload.agent.id) : ''
        if (sid && config) this.noteModel(sid, config.provider, config.model, 'agent/request')
      } catch {
        // Model tracking is advisory; the request must proceed.
      }
      return config
    })

    this.on('agent/request-error', (payload) => {
      try {
        this.handleRequestError(payload)
      } catch (error) {
        this.log.warn(`request-error failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    this.on('session/event', (session, event) => {
      try {
        this.handleSessionEvent(session, event)
      } catch (error) {
        this.log.warn(`session/event failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    this.on('tools/result', (exec, result) => {
      try {
        this.handleToolResult(exec, result)
      } catch (error) {
        this.log.warn(`tools/result index failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    this.on('tools/pre-execute', async (exec, next) => {
      try {
        const decision = await this.handlePreExecute(exec)
        if (decision) return decision
      } catch (error) {
        this.log.warn(`pre-execute gate degraded open: ${error instanceof Error ? error.message : String(error)}`)
      }
      return next()
    })

    this.on('llm/stream', (options, next) => this.wrapLlmStream(options, next))
  }

  async handleAgentCreated(agent) {
    if (!agent || !agent.id) return
    const sid = String(agent.id)
    this.lastSessionId = sid
    const agentCtx = agent.ctx || agent.context
    if (!agentCtx || typeof agentCtx.get !== 'function') return
    const systemPrompt = agentCtx.get('systemPrompt')
    if (!systemPrompt || typeof systemPrompt.section !== 'function') return
    try {
      const dispose = systemPrompt.section({
        name: `${PLUGIN_ID}.hot-memory`,
        order: this.config.memory.injectOrder,
        text: () => this.renderMemoryPrompt(sid),
      })
      if (typeof dispose === 'function') {
        this.agentSections.set(sid, dispose)
      }
    } catch (error) {
      this.log.warn(`agent memory section failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  handleAgentDisposed(agent) {
    if (!agent || !agent.id) return
    const sid = String(agent.id)
    const dispose = this.agentSections.get(sid)
    if (typeof dispose === 'function') {
      try {
        dispose()
      } catch {
        // Agent scope may already be unwound.
      }
    }
    this.agentSections.delete(sid)
    const cleanup = this.agentCleanups.get(sid)
    if (typeof cleanup === 'function') {
      try {
        cleanup()
      } catch {
        // Best effort.
      }
    }
    this.agentCleanups.delete(sid)
    this.scheduleSkillReview('session-end')
    this.scheduleCompact(sid)
    void this.usage.flush()
    void this.saveMemory()
  }

  noteModel(sid, provider, model, source = '') {
    const nextProvider = asString(provider).trim()
    const nextModel = asString(model).trim()
    if (!nextProvider && !nextModel) return
    const resolved = {
      provider: nextProvider || this.lastModel.provider,
      model: nextModel || this.lastModel.model,
    }
    this.lastModel = resolved
    if (!sid) return
    const previous = this.sessionModels.get(sid) || { provider: '', model: '', history: [] }
    const history = Array.isArray(previous.history) ? previous.history.slice() : []
    const last = history[history.length - 1]
    if (!last || last.provider !== resolved.provider || last.model !== resolved.model) {
      history.push({ ...resolved, at: Date.now(), source })
      while (history.length > 12) history.shift()
    }
    this.sessionModels.set(sid, { ...resolved, history })
  }

  handleSessionEvent(session, event) {
    if (!session || !event || typeof event !== 'object') return
    const sid = String(session.id)
    this.lastSessionId = sid
    this.noteNode(sid, event)
    switch (event.type) {
      case 'user/message': {
        const text = messageText(event.data)
        if (text && !isCheckpointText(text)) {
          this.memory.lastQuery.set(sid, text)
          this.remember(sid, 'intent', text, event.seq, event.time)
        }
        break
      }
      case 'assistant/message': {
        const message = event.data?.message
        if (message?.source?.provider) {
          this.noteModel(sid, message.source.provider, message.source.model, 'assistant/message')
        }
        const usage = normalizeTokenUsage(event.data?.usage) || extractUsageFromStream(event.data?.stream)
        if (usage) this.settleStreamForStep(sid, event.data?.turn, event.data?.step, usage, 'assistant/message')
        const text = messageText(message)
        if (text && !isCheckpointText(text)) this.remember(sid, 'outcome', text, event.seq, event.time)
        break
      }
      case 'assistant/attempt': {
        const usage = extractUsageFromStream(event.data?.stream)
        if (usage) this.settleStreamForStep(sid, event.data?.turn, event.data?.step, usage, 'assistant/attempt')
        break
      }
      case 'tool/call': {
        this.evidence.addCall({
          sessionId: sid,
          callId: event.data?.callId,
          name: event.data?.name,
          argumentsValue: event.data?.arguments,
        })
        break
      }
      case 'tool/result': {
        const callId = event.data?.message?.toolCallId
        this.evidence.addDurable({
          sessionId: sid,
          callId,
          message: event.data?.message,
          error: event.data?.error,
        })
        this.scheduleEvidenceSave()
        const output = messageText(event.data?.message)
        if (event.data?.error) {
          this.remember(sid, 'tool-error', `${event.data.error.name || 'tool'}: ${event.data.error.code || ''} ${output}`, event.seq, event.time)
        }
        break
      }
      case 'request/header': {
        const config = event.data?.header?.config
        if (config?.provider) {
          this.noteModel(sid, config.provider, config.model, 'request/header')
        }
        break
      }
      case 'request/context': {
        if (event.data?.provider) {
          this.noteModel(sid, event.data.provider, event.data.model || this.lastModel.model, 'request/context')
        }
        break
      }
      case 'step/end': {
        this.settleStep(sid, event.data?.turn, event.data?.step, 'step/end')
        break
      }
      case 'turn/end': {
        this.settleTurn(sid, event.data?.turn, 'turn/end')
        this.scheduleSkillReview('turn-end')
        this.scheduleCompact(sid)
        void this.usage.flush()
        break
      }
      default:
        break
    }
  }

  noteNode(sid, event) {
    if (!event.surfaceOp) return
    this.nodeTurns.set(`${sid}\0${event.seq}`, {
      type: event.type,
      turn: Math.trunc(finiteNumber(event.data?.turn, 0)),
      seq: event.seq,
    })
    if (this.nodeTurns.size > 20000) {
      const first = this.nodeTurns.keys().next()
      if (!first.done) this.nodeTurns.delete(first.value)
    }
  }

  remember(sid, kind, text, seq, time) {
    if (!this.config.memory.enabled) return
    const boundedText = asString(text).slice(0, 12000)
    const summary = summarizeText(boundedText, this.config.memory.summaryMaxChars)
    if (summary.length < 8) return
    if (isCheckpointText(summary)) return
    const keywords = keywordsOf(`${summary} ${boundedText}`, 12)
    const seedTokens = uniqueTokens(`${keywords.join(' ')} ${summary}`).slice(0, 24)
    const anchors = collectAnchors(`${summary}\n${boundedText}`).slice(0, 24)
    const id = `m-${shortHash(`${sid}\0${seq}\0${kind}\0${summary}`, 20)}`
    const record = {
      id,
      sessionId: sid,
      kind,
      summary,
      keywords,
      seedTokens,
      anchors,
      importance: classifyImportance(summary, kind),
      seq: Math.trunc(finiteNumber(seq, 0)),
      at: finiteNumber(time, Date.now()),
    }
    const list = this.memory.sessions.get(sid) || []
    const existing = list.findIndex((item) => item.id === id)
    if (existing >= 0) list[existing] = record
    else list.push(record)
    while (list.length > 64) list.shift()
    this.memory.sessions.set(sid, list)
    const clue = { ...record }
    this.memory.clues.set(id, clue)
    while (this.memory.clues.size > this.config.memory.clueMaxItems) {
      let worst = null
      for (const [key, value] of this.memory.clues) {
        if (worst === null ||
            value.importance < worst.value.importance ||
            (value.importance === worst.value.importance && value.seq < worst.value.seq)) {
          worst = { key, value }
        }
      }
      if (worst) this.memory.clues.delete(worst.key)
      else break
    }
    this.memory.revision += 1
    this.hotCache.delete(sid)
    this.scheduleMemorySave()
  }

  renderMemoryPrompt(sid) {
    if (!this.config.memory.enabled) return ''
    const cached = this.hotCache.get(sid)
    if (cached && cached.revision === this.memory.revision) return cached.text
    const records = (this.memory.sessions.get(sid) || [])
      .slice()
      .sort((left, right) => {
        if (right.importance !== left.importance) return right.importance - left.importance
        if (right.seq !== left.seq) return right.seq - left.seq
        return left.id.localeCompare(right.id)
      })
      .slice(0, this.config.memory.hotMaxItems)
    const lines = []
    let used = 0
    for (const record of records) {
      const line = `- [${record.kind}] ${record.summary}${record.keywords.length ? ` (${record.keywords.slice(0, 6).join(', ')})` : ''}`
      if (used + line.length > this.config.memory.hotMaxChars) break
      lines.push(line)
      used += line.length + 1
    }
    if (lines.length === 0) {
      const empty = { revision: this.memory.revision, text: '' }
      this.hotCache.set(sid, empty)
      return ''
    }
    const query = this.memory.lastQuery.get(sid) || lines.slice(0, 2).join(' ')
    const recall = this.bm25Recall(query, this.config.memory.recallTopK, new Set(records.map((record) => record.id)))
    const recallLines = []
    for (const item of recall) {
      const line = `- [${item.kind}] ${item.summary} (${item.sessionId.slice(0, 8)})`
      if (used + line.length > this.config.memory.injectionMaxChars) break
      recallLines.push(line)
      used += line.length + 1
    }
    const header = `[AGI HOT MEMORY | session ${sid.slice(0, 12)} | ${records.length} records | byte-stable]`
    const recallHeader = recallLines.length > 0 ? '\n[BM25 LONG-TAIL RECALL]' : ''
    const text = truncateCodePoints(
      `${header}\n${lines.join('\n')}${recallHeader}${recallLines.length ? `\n${recallLines.join('\n')}` : ''}`,
      this.config.memory.injectionMaxChars,
    )
    const snapshot = { revision: this.memory.revision, text }
    this.hotCache.set(sid, snapshot)
    return text
  }

  bm25Recall(query, topK, excludeIds) {
    const limit = Math.max(0, Math.min(50, Math.trunc(finiteNumber(topK, 0))))
    if (limit === 0) return []
    const queryTokens = uniqueTokens(query)
    if (queryTokens.length === 0) return []
    const documents = []
    for (const clue of this.memory.clues.values()) {
      if (!clue || excludeIds?.has(clue.id)) continue
      const text = `${(clue.keywords || []).join(' ')} ${(clue.seedTokens || []).join(' ')} ${clue.summary || ''}`
      const tokens = tokenize(text)
      if (tokens.length === 0) continue
      const frequencies = new Map()
      for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1)
      documents.push({ clue, tokens, frequencies, length: tokens.length })
    }
    if (documents.length === 0) return []
    const averageLength = documents.reduce((sum, document) => sum + document.length, 0) / documents.length
    const documentFrequency = new Map()
    for (const document of documents) {
      for (const token of queryTokens) {
        if (document.frequencies.has(token)) {
          documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)
        }
      }
    }
    const k1 = this.config.memory.bm25K1
    const b = this.config.memory.bm25B
    const scored = []
    for (const document of documents) {
      let score = 0
      for (const token of queryTokens) {
        const frequency = document.frequencies.get(token) || 0
        if (frequency === 0) continue
        const df = documentFrequency.get(token) || 0
        const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5))
        const denominator = frequency + k1 * (1 - b + b * (document.length / Math.max(1, averageLength)))
        score += idf * ((frequency * (k1 + 1)) / Math.max(1e-9, denominator))
      }
      if (score <= 0) continue
      if (score < this.config.memory.recallMinScore) continue
      scored.push({ score, document })
    }
    scored.sort((left, right) => right.score - left.score || right.document.clue.seq - left.document.clue.seq)
    return scored.slice(0, limit).map(({ score, document }) => ({
      id: document.clue.id,
      kind: document.clue.kind,
      summary: document.clue.summary,
      sessionId: document.clue.sessionId,
      score: round(score, 4),
    }))
  }

  handleToolResult(exec, result) {
    if (!exec || !exec.agent?.id) return
    const sid = String(exec.agent.id)
    this.lastSessionId = sid
    this.lastTool = asString(exec.name)
    const record = this.evidence.addResult({
      sessionId: sid,
      callId: exec.callId,
      tool: exec.name,
      argumentsValue: exec.arguments,
      result,
    })
    if (record) this.scheduleEvidenceSave()
    const text = resultText(result)
    if (result?.isError) {
      this.remember(sid, 'tool-error', `${exec.name}: ${text}`, 0, Date.now())
    } else if (/(?:test|build|lint|verify|check)/i.test(asString(exec.name))) {
      this.remember(sid, 'verification', `${exec.name}: ${text}`, 0, Date.now())
    }
  }

  async handlePreExecute(exec) {
    if (!exec || !exec.agent?.id) return undefined
    const tool = asString(exec.name)
    const sid = String(exec.agent.id)
    if (this.config.evidence.guardTools.includes(tool) || this.isWriteTool(tool)) {
      const decisions = await this.federation.arbitrate(`tool:${tool}`, { sessionId: sid, tool })
      for (const kind of ['jepa', 'cuv', 'mpRcp']) {
        const decision = decisions[kind]
        if (decision && decision.decision === 'deny' && this.config.federation[kind]?.blocking) {
          const reason = `federation ${kind} denied: ${asString(decision.reason, 'blocked')}`
          await this.audit.record('deny', `federation:${kind}`, sid, reason)
          return { kind: 'deny', reason }
        }
      }
    }
    if (this.config.security.denyWritesWithoutCredential && this.isWriteTool(tool)) {
      const trusted = await this.hasWorkspaceCredential()
      if (!trusted) {
        await this.audit.record('deny', `${tool}:workspace-credential`, sid, 'workspace credential missing')
        return { kind: 'deny', reason: 'workspace credential missing; zero-trust policy denies this write' }
      }
    }
    if (!this.config.evidence.enabled) return undefined
    if (!this.config.evidence.guardTools.includes(tool)) return undefined
    const content = extractClaimContent(exec.arguments)
    if (!content.trim()) return undefined
    const facts = extractClaimFacts(content, this.config.evidence.maxClaimsPerCall)
    if (facts.length === 0) return undefined
    const verdict = await this.evaluateClaims(sid, facts)
    if (verdict.ok) return undefined
    const preview = verdict.blocked.slice(0, 3).map((fact) => `${fact.kind}:${fact.value}`).join(', ')
    const reason = `evidence gate: ${verdict.blocked.length} unverified claim(s) [${preview}]; ladder exhausted own-session -> keyword -> other-session -> existence -> block`
    if (this.config.evidence.gateMode === 'observe') {
      await this.audit.record('ask', `${tool}:evidence-observe`, sid, reason, { blocked: verdict.blocked.length })
      return undefined
    }
    if (this.config.evidence.gateMode === 'ask') {
      await this.audit.record('ask', `${tool}:evidence-ask`, sid, reason, { blocked: verdict.blocked.length })
      return { kind: 'ask', reason }
    }
    if (this.config.evidence.blockOnUnverified) {
      await this.audit.record('deny', `${tool}:evidence`, sid, reason, { blocked: verdict.blocked.length })
      return { kind: 'deny', reason }
    }
    return undefined
  }

  isWriteTool(tool) {
    return ['write', 'edit', 'apply_patch', 'delete', 'move'].includes(asString(tool)) ||
      /(?:write|edit|delete|move|create|update)/i.test(asString(tool))
  }

  async evaluateClaims(sid, facts) {
    const blocked = []
    const accepted = []
    for (const fact of facts) {
      const match = this.evidence.match(fact, sid)
      if (match) {
        accepted.push({ fact, level: match.level, match: match.match })
        continue
      }
      if (this.config.evidence.existenceBaseline) {
        if (fact.kind === 'path' && await fileExists(fact.value)) {
          accepted.push({ fact, level: 'prior_verified', match: 'existence-baseline' })
          continue
        }
        if (fact.kind === 'version' && fact.value === this.compat.hostVersion) {
          accepted.push({ fact, level: 'prior_verified', match: 'existence-baseline' })
          continue
        }
        if (fact.kind === 'version' && fact.value === PLUGIN_VERSION) {
          accepted.push({ fact, level: 'prior_verified', match: 'existence-baseline' })
          continue
        }
        if (fact.kind === 'exit' && fact.value === '0') {
          const anyTested = [...(this.evidence.bySession.get(sid) || [])].some((record) => record.level === 'tested')
          if (anyTested) {
            accepted.push({ fact, level: 'tested', match: 'existence-baseline' })
            continue
          }
        }
      }
      blocked.push(fact)
    }
    return { ok: blocked.length === 0, blocked, accepted }
  }

  async hasWorkspaceCredential() {
    if (!this.config.security.enforce) return true
    for (const name of this.config.security.workspaceCredentialEnv) {
      if (process.env[name]) return true
    }
    const credentials = this.ctx?.get?.('credentials')
    if (!credentials || typeof credentials.resolve !== 'function') return false
    for (const name of this.config.security.workspaceCredentialEnv) {
      try {
        const resolved = await credentials.resolve(name)
        if (resolved && typeof resolved.value === 'string' && resolved.value.length > 0) return true
      } catch {
        // Missing/unavailable credential service means deny for gated writes.
      }
    }
    return false
  }

  handleRequestError(payload) {
    const provider = asString(payload?.provider)
    const failure = payload?.failure
    const retryAfter = Math.max(0, finiteNumber(failure?.providerRetryAfterMs, 0))
    const cooldown = Math.max(retryAfter, this.config.usage.breakerCooldownMs)
    const state = this.providerState(provider)
    state.status = failure?.code ? `error:${failure.code}` : 'error'
    state.lastError = truncateCodePoints(redactSecrets(failure?.message || ''), 240)
    state.breakerUntil = Math.max(state.breakerUntil || 0, Date.now() + cooldown)
    this.providerStates.set(provider, state)
  }

  providerState(provider) {
    const key = asString(provider, 'unknown')
    const existing = this.providerStates.get(key)
    if (existing) return existing
    const config = this.providerConfig(key)
    return {
      id: config?.id || key,
      label: config?.label || key,
      balance: null,
      currency: config?.currency || this.config.usage.currency,
      monthUsd: 0,
      budgetUsd: config?.monthlyBudgetUsd || this.config.usage.defaultMonthlyBudgetUsd,
      spendOnly: config?.spendOnly !== false,
      status: 'unknown',
      lastError: '',
      updatedAt: 0,
      breakerUntil: 0,
    }
  }

  providerConfig(route) {
    const key = asString(route).toLowerCase()
    return this.config.usage.providers.find((provider) => {
      if (!provider.enabled) return false
      return provider.id.toLowerCase() === key ||
        provider.protocol.toLowerCase() === key ||
        key.startsWith(`${provider.id.toLowerCase()}/`)
    }) || null
  }

  handleStreamFrame(payload) {
    if (!this.config.usage.enabled) return
    const agent = payload?.agent
    const frame = payload?.frame
    if (!agent?.id || !frame) return
    const sid = String(agent.id)
    const attemptId = asString(frame.attemptId)
    if (!attemptId) return
    if (frame.type === 'start') {
      const session = this.ctx?.get?.('sessions')?.get?.(sid)
      let model = { provider: '', model: '' }
      try {
        const known = this.sessionModels.get(sid)
        if (known?.provider) model = { provider: known.provider, model: known.model }
        else {
          const context = session?.requestContext?.()
          if (context) model = { provider: asString(context.provider), model: asString(context.model) }
        }
      } catch {
        // Route metadata is optional.
      }
      if (!model.provider) model = { ...this.lastModel }
      if (model.provider) this.noteModel(sid, model.provider, model.model, 'stream-start')
      const inputEstimate = this.estimateInputTokens(session)
      const stream = {
        attemptId,
        sessionId: sid,
        turn: Math.trunc(finiteNumber(frame.turn, 0)),
        step: Math.trunc(finiteNumber(frame.step, 0)),
        provider: model.provider,
        model: model.model,
        inputEstimate,
        outputChars: 0,
        outputEstimate: 0,
        officialUsage: null,
        startedAt: Date.now(),
        lastActivity: Date.now(),
        settled: false,
        flushTimer: null,
        fallbackTimer: null,
      }
      this.streams.set(attemptId, stream)
      this.stepStreams.set(`${sid}\0${stream.turn}\0${stream.step}`, attemptId)
      this.lastModel = model
      this.lastSessionId = sid
      this.publishStream(stream)
      return
    }
    const stream = this.streams.get(attemptId)
    if (!stream) return
    stream.lastActivity = Date.now()
    if (frame.type === 'chunk') {
      const chunk = frame.chunk
      if (!chunk || typeof chunk !== 'object') return
      if (chunk.type === 'usage' && chunk.usage) {
        stream.officialUsage = normalizeTokenUsage(chunk.usage) || stream.officialUsage
      } else if (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta') {
        stream.outputChars += asString(chunk.text).length
      } else if (chunk.type === 'tool-call-delta') {
        stream.outputChars += asString(chunk.argumentsDelta).length + asString(chunk.name).length
      }
      stream.outputEstimate = Math.ceil(stream.outputChars / Math.max(1, this.config.usage.estimateCharsPerToken))
      this.scheduleStreamFlush(stream)
      return
    }
    if (frame.type === 'end') {
      if (stream.flushTimer) {
        clearTimeout(stream.flushTimer)
        stream.flushTimer = null
      }
      this.publishStream(stream)
      if (frame.outcome?.kind === 'abandoned') {
        this.streams.delete(attemptId)
        this.stepStreams.delete(`${sid}\0${stream.turn}\0${stream.step}`)
        return
      }
      if (!stream.officialUsage) {
        const raw = this.pendingRawUsage.get(sid)
        if (raw) {
          stream.officialUsage = raw
          this.pendingRawUsage.delete(sid)
        }
      }
      stream.fallbackTimer = setTimeout(() => {
        if (stream.settled) return
        this.settleStream(stream, stream.officialUsage, Boolean(stream.officialUsage), 'stream-end')
      }, 1800)
      if (typeof stream.fallbackTimer.unref === 'function') stream.fallbackTimer.unref()
    }
  }

  scheduleStreamFlush(stream) {
    if (stream.flushTimer) clearTimeout(stream.flushTimer)
    stream.flushTimer = setTimeout(() => {
      stream.flushTimer = null
      this.publishStream(stream)
    }, this.config.usage.streamDebounceMs)
    if (typeof stream.flushTimer.unref === 'function') stream.flushTimer.unref()
  }

  publishStream(stream) {
    if (!stream || stream.settled) return
    this.lastSessionId = stream.sessionId
    this.noteModel(stream.sessionId, stream.provider, stream.model, 'stream')
  }

  estimateInputTokens(session) {
    if (!session) return 0
    try {
      const meter = this.ctx?.get?.('tokenMeter')
      if (meter && typeof meter.measure === 'function') {
        const measured = meter.measure(session)
        if (measured && Number.isFinite(measured.totalTokens)) return Math.max(0, Math.round(measured.totalTokens))
      }
    } catch {
      // Fall through to the local heuristic.
    }
    try {
      const messages = session.deriveMessages?.() || []
      let text = ''
      for (const message of messages) text += `${messageText(message)}\n`
      return estimateTokens(text, this.config.usage.estimateCharsPerToken)
    } catch {
      return 0
    }
  }

  settleStreamForStep(sid, turn, step, usage, source) {
    const key = `${sid}\0${Math.trunc(finiteNumber(turn, 0))}\0${Math.trunc(finiteNumber(step, 0))}`
    const attemptId = this.stepStreams.get(key)
    if (!attemptId) {
      const fallback = {
        attemptId: `resumed-${key}`,
        sessionId: sid,
        turn: Math.trunc(finiteNumber(turn, 0)),
        step: Math.trunc(finiteNumber(step, 0)),
        provider: this.lastModel.provider,
        model: this.lastModel.model,
        inputEstimate: 0,
        outputChars: 0,
        outputEstimate: 0,
        settled: false,
      }
      this.settleStream(fallback, usage, true, source)
      return
    }
    const stream = this.streams.get(attemptId)
    if (!stream) return
    this.settleStream(stream, usage, true, source)
  }

  settleStep(sid, turn, step, source) {
    const key = `${sid}\0${Math.trunc(finiteNumber(turn, 0))}\0${Math.trunc(finiteNumber(step, 0))}`
    const attemptId = this.stepStreams.get(key)
    if (!attemptId) return
    const stream = this.streams.get(attemptId)
    if (!stream || stream.settled) return
    this.settleStream(stream, stream.officialUsage || this.pendingRawUsage.get(sid), Boolean(stream.officialUsage || this.pendingRawUsage.get(sid)), source)
  }

  settleTurn(sid, turn, source) {
    for (const [attemptId, stream] of this.streams) {
      if (stream.sessionId !== sid) continue
      if (turn !== undefined && stream.turn !== Math.trunc(finiteNumber(turn, 0))) continue
      if (stream.settled) continue
      this.settleStream(stream, stream.officialUsage || this.pendingRawUsage.get(sid), Boolean(stream.officialUsage || this.pendingRawUsage.get(sid)), source)
    }
  }

  settleStream(stream, rawUsage, official, source) {
    if (!stream || stream.settled) return
    stream.settled = true
    if (stream.flushTimer) clearTimeout(stream.flushTimer)
    if (stream.fallbackTimer) clearTimeout(stream.fallbackTimer)
    const usage = normalizeTokenUsage(rawUsage) || {
      inputTokens: Math.max(0, Math.trunc(stream.inputEstimate || 0)),
      outputTokens: Math.max(0, Math.trunc(stream.outputEstimate || 0)),
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
      totalTokens: Math.max(0, Math.trunc((stream.inputEstimate || 0) + (stream.outputEstimate || 0))),
    }
    const result = this.usage.record({
      sessionId: stream.sessionId,
      provider: stream.provider || this.lastModel.provider,
      model: stream.model || this.lastModel.model,
      usage,
      estimated: !official,
      source,
    })
    if (result) this.lastSettlement = { ...result, sessionId: stream.sessionId, at: Date.now() }
    this.streams.delete(stream.attemptId)
    this.stepStreams.delete(`${stream.sessionId}\0${stream.turn}\0${stream.step}`)
    if (this.pendingRawUsage.has(stream.sessionId)) this.pendingRawUsage.delete(stream.sessionId)
  }

  wrapLlmStream(options, next) {
    if (!this.config.usage.enabled) return next()
    const provider = asString(options?.provider)
    const state = this.providerState(provider)
    if (state.breakerUntil > Date.now()) {
      const error = new Error(
        `AGI_FEDERATED_BUDGET_EXCEEDED: provider ${provider} is in breaker cooldown until ${isoTime(state.breakerUntil)}`,
      )
      error.code = 'AGI_FEDERATED_BUDGET_EXCEEDED'
      void this.audit.record(
        'deny',
        `llm:${provider}:budget-breaker`,
        asString(options?.sessionId),
        error.message,
      )
      throw error
    }
    const tracker = new ProviderUsageTracker(provider)
    async function* observe(self) {
      for await (const chunk of next()) {
        try {
          tracker.push(chunk)
        } catch {
          // Observation must never break the model stream.
        }
        yield chunk
      }
      try {
        const usage = tracker.snapshot()
        if (usage && options?.sessionId) self.pendingRawUsage.set(String(options.sessionId), usage)
      } catch {
        // Best-effort usage cache.
      }
    }
    return observe(this)
  }

  scheduleCompact(sid) {
    if (!this.config.context.enabled || !sid) return
    if (this.compactTimers.has(sid)) return
    const timer = setTimeout(() => {
      this.compactTimers.delete(sid)
      void this.compactSession(sid)
    }, this.config.context.idleDelayMs)
    if (typeof timer.unref === 'function') timer.unref()
    this.compactTimers.set(sid, timer)
  }

  async compactSession(sid) {
    if (!this.config.context.enabled || !sid || this.disposed) return
    await this.ready
    try {
      const agents = this.ctx?.get?.('agents')
      const agent = agents && typeof agents.get === 'function' ? agents.get(sid) : undefined
      if (agent && agent.status === 'running') return
      const session = this.ctx?.get?.('sessions')?.get?.(sid)
      if (!session || typeof session.surface?.nodes === 'undefined') return
      const nodes = [...session.surface.nodes]
      if (nodes.length < this.config.context.minEvictNodes + 2) return
      let maxTurn = 0
      const metas = new Map()
      for (const seq of nodes) {
        const meta = this.nodeMetaFor(session, sid, seq)
        if (meta) {
          metas.set(seq, meta)
          maxTurn = Math.max(maxTurn, Math.trunc(finiteNumber(meta.turn, 0)))
        }
      }
      if (maxTurn < this.config.context.keepRecentTurns + 1) return
      const cutoff = maxTurn - this.config.context.keepRecentTurns + 1
      const evict = []
      for (let index = 0; index < nodes.length; index += 1) {
        const seq = nodes[index]
        const meta = metas.get(seq)
        if (!meta) break
        if (meta.type === 'system/message') {
          if (index === 0) continue
          break
        }
        if (meta.turn >= cutoff) break
        evict.push(seq)
      }
      if (evict.length < this.config.context.minEvictNodes) return
      const startSeq = evict[0]
      const endSeq = evict[evict.length - 1]
      let template = null
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const seq = nodes[index]
        const meta = metas.get(seq)
        if (!meta || meta.type !== 'user/message') continue
        try {
          const message = session.deriveEventMessage?.(session.eventAt?.(seq))
          if (message && message.role === 'user') {
            template = message
            break
          }
        } catch {
          // A missing template falls back to a minimal valid user message.
        }
      }
      const placeholder = makeCheckpointPlaceholder(startSeq, endSeq, this.config.context.placeholderLength)
      const now = Date.now()
      const message = {
        ...(template && typeof template === 'object' ? template : {}),
        id: `msg-agi-${now.toString(36)}-${shortHash(`${sid}\0${startSeq}\0${endSeq}`, 8)}`,
        createdAt: now,
        role: 'user',
        content: [{ type: 'text', text: placeholder }],
        source: { kind: 'user' },
      }
      if (this.checkpoints.has(`${sid}\0${startSeq}\0${endSeq}`)) return
      session.append('user/message', message, {
        surfaceOp: { op: 'replace', startSeq, endSeq },
        sourceEventSeqs: evict,
      })
      this.checkpoints.set(`${sid}\0${startSeq}\0${endSeq}`, {
        startSeq,
        endSeq,
        count: evict.length,
        placeholderLength: placeholder.length,
        at: now,
      })
      this.scheduleCheckpointSave()
    } catch (error) {
      this.log.warn(`surface compaction skipped: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  nodeMetaFor(session, sid, seq) {
    const key = `${sid}\0${seq}`
    const cached = this.nodeTurns.get(key)
    if (cached) return cached
    try {
      const event = session.eventAt?.(seq)
      if (!event || !event.surfaceOp) return null
      const meta = {
        type: event.type,
        turn: Math.trunc(finiteNumber(event.data?.turn, 0)),
        seq,
      }
      this.nodeTurns.set(key, meta)
      return meta
    } catch {
      return null
    }
  }

  scheduleSkillReview(reason) {
    if (!this.config.skills.enabled) return
    this.skills.scheduleReview(reason, this.config.skills.reviewDelayMs)
  }

  async checkCompat() {
    const warnings = []
    let hostVersion = ''
    try {
      const clientModules = this.ctx?.get?.('clientModules')
      const graph = clientModules && typeof clientModules.graph === 'function' ? clientModules.graph() : null
      hostVersion = asString(graph?.release?.version)
    } catch {
      warnings.push('host version unavailable from clientModules')
    }
    if (!hostVersion) hostVersion = asString(process.env.DSH_VERSION)
    try {
      const packagePath = fileURLToPath(new URL('./package.json', import.meta.url))
      const raw = await fsp.readFile(packagePath, 'utf8')
      const manifest = JSON.parse(raw)
      const peers = isPlainObject(manifest.peerDependencies) ? manifest.peerDependencies : {}
      if (hostVersion) {
        for (const [name, range] of Object.entries(peers)) {
          if (name === '@deepseek-ai/cordis') continue
          if (!satisfiesRange(hostVersion, asString(range))) {
            warnings.push(`${name} peer range ${range} does not include host ${hostVersion}`)
          }
        }
      } else {
        warnings.push('compat-sync skipped: no host version exposed')
      }
    } catch (error) {
      warnings.push(`compat-sync read failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    this.compat = {
      status: warnings.length === 0 ? 'ok' : 'warn',
      hostVersion,
      warnings: warnings.slice(0, 32),
    }
    if (warnings.length > 0) this.log.warn(`compat-sync warning only: ${warnings.join('; ')}`)
    return this.compat
  }

  startBalanceTimer() {
    if (!this.config.usage.enabled || this.disposed) return
    const interval = Math.max(500, this.config.usage.refreshIntervalMs)
    this.balanceTimer = setInterval(() => {
      void this.refreshBalances()
    }, interval)
    if (typeof this.balanceTimer.unref === 'function') this.balanceTimer.unref()
  }

  async refreshBalances() {
    if (this.refreshingBalances || this.disposed) return
    this.refreshingBalances = true
    try {
      for (const provider of this.config.usage.providers) {
        if (!provider.enabled) continue
        this.usage.ensureMonth()
        const state = this.providerState(provider.id)
        state.monthUsd = this.usage.monthSpentFor(provider.id)
        state.budgetUsd = provider.monthlyBudgetUsd || this.config.usage.defaultMonthlyBudgetUsd
        state.spendOnly = provider.spendOnly
        state.currency = provider.currency
        state.status = 'ok'
        state.lastError = ''
        try {
          if (provider.protocol === 'deepseek-account' && !provider.spendOnly) {
            const account = this.ctx?.get?.('deepseekAccount')
            if (account && typeof account.getBalance === 'function') {
              const balance = await account.getBalance({
                version: PLUGIN_VERSION,
                locale: 'zh-CN',
                timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
              })
              if (balance && balance.status === 'ready' && Array.isArray(balance.value)) {
                const wallet = balance.value[0]
                if (wallet) {
                  state.balance = round(finiteNumber(wallet.balance, 0), 4)
                  state.currency = asString(wallet.currency, provider.currency)
                }
              } else {
                state.status = 'balance-unavailable'
                state.balance = null
                state.spendOnly = true
              }
            } else {
              state.status = 'account-unavailable'
              state.balance = null
              state.spendOnly = true
            }
          } else if (!provider.spendOnly && provider.balanceUrl) {
            const key = await this.resolveCredential(provider.credentialEnv)
            if (!key) {
              state.status = 'credential-missing'
              state.balance = null
              state.spendOnly = true
            } else {
              const response = await abortableFetch(provider.balanceUrl, {
                method: 'GET',
                headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
              }, 1500)
              if (!response.ok) {
                state.status = `balance-http-${response.status}`
                state.balance = null
                state.spendOnly = true
              } else {
                const payload = await response.json()
                const raw = getByPath(payload, provider.balanceJsonPath)
                if (raw !== undefined && Number.isFinite(Number(raw))) {
                  state.balance = round(Number(raw) * Math.max(0, finiteNumber(provider.balanceMultiplier, 1)), 4)
                } else {
                  state.status = 'balance-path-missing'
                  state.balance = null
                  state.spendOnly = true
                }
              }
            }
          } else {
            state.balance = null
            state.spendOnly = true
          }
        } catch (error) {
          state.status = 'balance-error'
          state.balance = null
          state.spendOnly = true
          state.lastError = truncateCodePoints(redactSecrets(error instanceof Error ? error.message : String(error)), 180)
        }
        if (state.spendOnly && state.budgetUsd > 0 && state.monthUsd >= state.budgetUsd) {
          state.breakerUntil = nextMonthStart()
          state.status = 'budget-breaker'
        } else if (state.balance !== null && state.balance <= 0) {
          state.breakerUntil = Math.max(state.breakerUntil || 0, Date.now() + this.config.usage.breakerCooldownMs)
          state.status = 'balance-breaker'
        } else if (state.breakerUntil <= Date.now()) {
          state.breakerUntil = 0
        }
        state.updatedAt = Date.now()
        this.providerStates.set(provider.id, state)
      }
      this.lastBalanceRefresh = Date.now()
    } catch (error) {
      this.log.warn(`balance refresh failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      this.refreshingBalances = false
    }
  }

  async resolveCredential(environmentName) {
    const name = asString(environmentName)
    if (!name) return ''
    if (process.env[name]) return process.env[name]
    const credentials = this.ctx?.get?.('credentials')
    if (!credentials || typeof credentials.resolve !== 'function') return ''
    try {
      const resolved = await credentials.resolve(name)
      return resolved && typeof resolved.value === 'string' ? resolved.value : ''
    } catch {
      return ''
    }
  }

  async status(sessionId, includeDetails = false) {
    await this.ready
    const sid = asString(sessionId) || this.lastSessionId
    const session = sid ? this.ctx?.get?.('sessions')?.get?.(sid) : undefined
    const knownModel = sid ? this.sessionModels.get(sid) : null
    let model = knownModel?.provider
      ? { provider: knownModel.provider, model: knownModel.model }
      : { ...this.lastModel }
    let contextWindow = 0
    try {
      const context = session?.requestContext?.()
      if (context) {
        if (!knownModel?.provider) {
          model = { provider: asString(context.provider), model: asString(context.model) }
        }
        contextWindow = Math.max(0, Math.trunc(finiteNumber(context.contextWindow, 0)))
      }
    } catch {
      // Keep the cached route.
    }
    let contextTokens = 0
    try {
      const meter = this.ctx?.get?.('tokenMeter')
      if (meter && session && typeof meter.measure === 'function') {
        const measured = meter.measure(session)
        contextTokens = Math.max(0, Math.trunc(finiteNumber(measured?.totalTokens, 0)))
      }
    } catch {
      contextTokens = 0
    }
    if (contextTokens === 0) contextTokens = this.estimateInputTokens(session)
    if (this.lastSettlement?.sessionId === sid && this.lastSettlement.usage) {
      const settled = this.lastSettlement.usage
      contextTokens = Math.max(
        0,
        Math.trunc(finiteNumber(settled.inputTokens, 0) + finiteNumber(settled.cacheReadTokens, 0) + finiteNumber(settled.outputTokens, 0)),
      )
    }
    const sessionUsage = sid ? this.usage.session(sid) : this.usage.blankBucket()
    const contextRatio = contextWindow > 0 ? Math.min(1, contextTokens / contextWindow) : 0
    const contextLevel = contextRatio >= 0.8 ? 'critical' : contextRatio >= 0.6 ? 'warn' : contextRatio >= 0.45 ? 'notice' : 'normal'
    const month = this.usage.snapshot().month
    const monthUsd = Object.values(month).reduce(
      (sum, bucket) => sum + finiteNumber(bucket.costUsd, 0),
      0,
    )
    const providers = []
    for (const provider of this.config.usage.providers) {
      if (!provider.enabled) continue
      const state = this.providerState(provider.id)
      const remaining = Math.max(0, finiteNumber(state.breakerUntil, 0) - Date.now())
      providers.push({
        id: provider.id,
        label: provider.label,
        balance: state.balance === null ? null : round(state.balance, 4),
        currency: state.currency,
        monthUsd: round(state.monthUsd, 6),
        budgetUsd: round(state.budgetUsd, 4),
        spendOnly: Boolean(state.spendOnly),
        status: state.status,
        lastError: state.lastError,
        updatedAt: state.updatedAt,
        breakerRemainingMs: remaining,
        breakerUntil: state.breakerUntil,
      })
    }
    const activeStreams = [...this.streams.values()].filter(
      (stream) => stream.sessionId === sid && !stream.settled,
    )
    const streamingActive = activeStreams.length > 0
    const estimatedOutputTokens = activeStreams.reduce(
      (sum, stream) => sum + Math.max(0, Math.trunc(stream.outputEstimate || 0)),
      0,
    )
    const evidenceCounts = this.evidence.counts()
    let skillCounts = { staged: 0, promoted: 0, rejected: 0 }
    try {
      skillCounts = await this.skills.counts()
    } catch {
      // Counts are informational.
    }
    let skillList = []
    if (includeDetails) {
      try {
        skillList = await this.skills.list('all')
      } catch {
        // Detail view degrades to an empty list.
      }
    }
    const details = includeDetails
      ? {
          memory: {
            text: this.renderMemoryPrompt(sid),
            records: (this.memory.sessions.get(sid) || []).length,
            clues: [...this.memory.clues.values()]
              .filter((clue) => !sid || clue.sessionId === sid)
              .slice(-40)
              .map((clue) => ({
                kind: clue.kind,
                summary: clue.summary,
                keywords: clue.keywords,
                importance: clue.importance,
                anchors: clue.anchors,
              })),
          },
          evidence: {
            recent: ((this.evidence.bySession.get(sid) || []).slice(-30)).map((record) => ({
              tool: record.tool,
              level: record.level,
              summary: record.summary,
              at: record.at,
              anchors: [...(record.params || []), ...(record.anchors || [])].slice(0, 8),
            })),
          },
          skills: { list: skillList },
        }
      : undefined
    const federation = {}
    for (const kind of ['jepa', 'cuv', 'mpRcp']) {
      const config = this.config.federation[kind]
      federation[kind] = {
        enabled: Boolean(config?.enabled),
        allow: Boolean(config?.allow),
        blocking: Boolean(config?.blocking),
      }
    }
    return {
      ok: true,
      version: PLUGIN_VERSION,
      configVersion: CONFIG_VERSION,
      generatedAt: Date.now(),
      sessionId: sid,
      model,
      modelHistory: sid && this.sessionModels.get(sid)?.history ? this.sessionModels.get(sid).history : [],
      session: {
        inputTokens: sessionUsage.inputTokens,
        outputTokens: sessionUsage.outputTokens,
        cacheReadTokens: sessionUsage.cacheReadTokens,
        cacheWriteTokens: sessionUsage.cacheWriteTokens,
        totalTokens: sessionUsage.inputTokens + sessionUsage.outputTokens + sessionUsage.cacheReadTokens + sessionUsage.cacheWriteTokens,
        contextTokens: Math.max(0, Math.trunc(contextTokens)),
        contextWindow,
        contextRatio: round(contextRatio, 4),
        contextLevel,
      },
      cost: {
        currency: this.config.usage.currency,
        sessionUsd: round(sessionUsage.costUsd, 8),
        monthUsd: round(monthUsd, 8),
        totalUsd: round(this.usage.total().costUsd, 8),
      },
      pricing: {
        model: model.model || '',
        peak: isDeepSeekPeak(),
        source: 'https://api-docs.deepseek.com/quick_start/pricing',
      },
      health: {
        ok: !this.degraded,
        auditChain: this.audit.broken ? 'broken' : 'ok',
        evidenceGate: this.config.evidence.enabled ? this.config.evidence.gateMode : 'off',
        memoryBounded: this.memory.clues.size <= this.config.memory.clueMaxItems,
        modelTracked: Boolean(model.provider && model.model),
        contextLevel,
      },
      providers,
      streaming: {
        active: streamingActive,
        estimatedOutputTokens,
        debounceMs: this.config.usage.streamDebounceMs,
      },
      evidence: evidenceCounts,
      skills: skillCounts,
      federation,
      compat: this.compat,
      audit: this.audit.snapshot(),
      ...(details ? { details } : {}),
      lastSettlement: this.lastSettlement,
      lastBalanceRefresh: this.lastBalanceRefresh,
      degraded: this.degraded,
      degradedReason: this.degraded ? this.degradedReason : '',
    }
  }

  registerTools() {
    const tools = this.ctx?.get?.('tools')
    if (!tools || typeof tools.register !== 'function') return
    const register = (definition) => {
      try {
        tools.register(definition)
      } catch (error) {
        this.log.warn(`tool ${definition.name} registration failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const output = (description) => ({
      schema: {
        type: 'object',
        additionalProperties: true,
        description,
      },
      render: (_args, value) => [
        {
          type: 'text',
          text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
        },
      ],
    })
    register({
      name: 'agi_status',
      description: 'Read the AGI federated cache: model, session tokens, costs, provider balances, evidence/skill counts, federation seams, and audit sequence.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          session_id: { type: 'string', description: 'Optional session id; defaults to the last active session.' },
        },
      },
      output: output('AGI federated status snapshot.'),
      isConcurrencySafe: () => true,
      execute: async (args, exec) => {
        await this.ready
        const sid = asString(args?.session_id) || asString(exec?.agent?.id) || this.lastSessionId
        return this.status(sid)
      },
    })
    register({
      name: 'agi_clue_search',
      description: 'Search the bounded clue store with BM25. Returns distilled summaries and anchors only; it never returns full stored transcripts.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Search query.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 8 },
        },
      },
      output: output('BM25 long-tail recall results.'),
      isConcurrencySafe: () => true,
      execute: async (args) => {
        await this.ready
        const limit = Math.max(1, Math.min(50, Math.trunc(finiteNumber(args?.limit, 8))))
        const results = this.bm25Recall(asString(args?.query), limit, new Set())
        return { query: asString(args?.query), results, storedClues: this.memory.clues.size }
      },
    })
    register({
      name: 'agi_memory_snapshot',
      description: 'Render the exact bounded Hot Memory + BM25 injection text for a session without changing durable state.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          session_id: { type: 'string', description: 'Optional session id.' },
        },
      },
      output: output('Byte-stable bounded memory injection text.'),
      isConcurrencySafe: () => true,
      execute: async (args, exec) => {
        await this.ready
        const sid = asString(args?.session_id) || asString(exec?.agent?.id) || this.lastSessionId
        return { sessionId: sid, text: this.renderMemoryPrompt(sid), clues: this.memory.clues.size }
      },
    })
    register({
      name: 'agi_evidence_query',
      description: 'Query the per-session evidence index (400 records) by keywords. Returns distilled anchors and evidence levels, not raw tool output.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Keywords or an anchor to look for.' },
          session_id: { type: 'string', description: 'Optional session id.' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
      output: output('Evidence records with levels and anchors.'),
      isConcurrencySafe: () => true,
      execute: async (args, exec) => {
        await this.ready
        const sid = asString(args?.session_id) || asString(exec?.agent?.id) || this.lastSessionId
        return {
          sessionId: sid,
          results: this.evidence.query(sid, asString(args?.query), Math.trunc(finiteNumber(args?.limit, 10))),
          counts: this.evidence.counts(),
        }
      },
    })
    register({
      name: 'agi_skill_stage',
      description: 'Stage a skill for background review. This never promotes immediately; idle/session-end review decides promotion.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'content'],
        properties: {
          name: { type: 'string', description: '3-64 character skill name.' },
          content: { type: 'string', description: 'Complete skill body, max configured bytes.' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags.',
          },
        },
      },
      output: output('Staged skill receipt. Promotion is deferred.'),
      execute: async (args, exec) => {
        await this.ready
        const trusted = await this.hasWorkspaceCredential()
        if (this.config.security.enforce && !trusted) {
          const sid = asString(exec?.agent?.id)
          await this.audit.record('deny', 'agi_skill_stage:workspace-credential', sid, 'workspace credential missing')
          throw new Error('workspace credential missing; skill staging denied')
        }
        const result = await this.skills.stage({
          name: args?.name,
          content: args?.content,
          tags: args?.tags,
          sourceSession: asString(exec?.agent?.id),
        })
        return {
          ok: true,
          staged: true,
          promoted: false,
          review: 'deferred-to-idle-or-session-end',
          ...result,
        }
      },
    })
    register({
      name: 'agi_skill_list',
      description: 'List staged, promoted, or rejected skills. Content is omitted; only metadata is returned.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          stage: { type: 'string', enum: ['all', 'staged', 'promoted', 'rejected'], default: 'all' },
        },
      },
      output: output('Skill metadata list.'),
      isConcurrencySafe: () => true,
      execute: async (args) => {
        await this.ready
        const stage = ['all', 'staged', 'promoted', 'rejected'].includes(args?.stage) ? args.stage : 'all'
        return { stage, skills: await this.skills.list(stage), counts: await this.skills.counts() }
      },
    })
    register({
      name: 'agi_skill_review',
      description: 'Schedule the background skill review. It returns before promotion; the actual review runs after the configured idle delay.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          reason: { type: 'string', description: 'Optional review reason.' },
        },
      },
      output: output('Review scheduling receipt.'),
      execute: async (args, exec) => {
        await this.ready
        const trusted = await this.hasWorkspaceCredential()
        if (this.config.security.enforce && !trusted) {
          await this.audit.record('deny', 'agi_skill_review:workspace-credential', asString(exec?.agent?.id), 'workspace credential missing')
          throw new Error('workspace credential missing; skill review denied')
        }
        const scheduled = this.skills.scheduleReview(asString(args?.reason, 'tool'), this.config.skills.reviewDelayMs)
        return { scheduled, promoted: false, note: 'promotion happens in the background review' }
      },
    })
    register({
      name: 'agi_federation_ping',
      description: 'Probe the JEPA, CUV, and mp-rcp federation seams. All seams default to advisory allow and never block the loop.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', description: 'Optional action description to arbitrate.' },
        },
      },
      output: output('Federation seam snapshot and advisory decisions.'),
      isConcurrencySafe: () => true,
      execute: async (args) => {
        await this.ready
        const decisions = await this.federation.arbitrate(asString(args?.action, 'probe'), {
          sessionId: this.lastSessionId,
        })
        return { seams: this.federation.snapshot(), decisions }
      },
    })
  }

  registerCommand() {
    const commands = this.ctx?.get?.('commands')
    if (!commands || typeof commands.register !== 'function') return
    try {
      commands.register({
        name: 'agi',
        description: 'Show AGI federated status (tokens, cost, balances, evidence, seams).',
        handler: async (invocation) => {
          try {
            const snapshot = await this.status(String(invocation?.agent?.id || ''))
            return { kind: 'success', text: this.formatStatusText(snapshot) }
          } catch (error) {
            return {
              kind: 'error',
              text: `AGI status failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        },
      })
    } catch (error) {
      this.log.warn(`command registration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  formatStatusText(snapshot) {
    const lines = [
      `AGI FEDERATED ${snapshot.version} · ${snapshot.compat.status}`,
      `model: ${snapshot.model.provider || '—'}/${snapshot.model.model || '—'}`,
      `session: ${snapshot.session.totalTokens} tokens · ${formatUsd(snapshot.cost.sessionUsd)}`,
      `month: ${formatUsd(snapshot.cost.monthUsd)} · total: ${formatUsd(snapshot.cost.totalUsd)}`,
      `evidence: ${snapshot.evidence.records} records / ${snapshot.evidence.sessions} sessions`,
      `skills: ${snapshot.skills.staged} staged · ${snapshot.skills.promoted} promoted`,
    ]
    for (const provider of snapshot.providers) {
      lines.push(
        `${provider.id}: ${provider.balance === null ? 'spendOnly' : `${provider.balance} ${provider.currency}`}` +
          ` · month ${formatUsd(provider.monthUsd)}${provider.budgetUsd > 0 ? ` / ${formatUsd(provider.budgetUsd)}` : ''}` +
          `${provider.breakerRemainingMs > 0 ? ` · breaker ${Math.ceil(provider.breakerRemainingMs / 1000)}s` : ''}`,
      )
    }
    if (snapshot.compat.warnings.length > 0) lines.push(`compat: ${snapshot.compat.warnings.join('; ')}`)
    if (snapshot.degraded) lines.push(`persistence degraded: ${snapshot.degradedReason}`)
    return lines.join('\n')
  }

  registerUi() {
    if (!this.config.ui.enabled) return
    const web = this.ctx?.get?.('webServer')
    if (!web || typeof web.register !== 'function') return
    try {
      const register = (route) => {
        const dispose = web.register(route)
        return typeof dispose === 'function' ? dispose : () => undefined
      }
      const statusDispose = register({
        kind: 'exact',
        path: '/agi-federated/status',
        handler: async (request, response) => {
          try {
            const url = new URL(request.url || '/', 'http://127.0.0.1')
            const sid = url.searchParams.get('sessionId') || url.searchParams.get('session') || ''
            const includeDetails = url.searchParams.get('details') === '1'
            const body = JSON.stringify(await this.status(sid, includeDetails))
            response.writeHead(200, {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store, max-age=0',
              'x-content-type-options': 'nosniff',
            })
            response.end(request.method === 'HEAD' ? undefined : body)
          } catch (error) {
            const body = JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            })
            response.writeHead(500, {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            })
            response.end(body)
          }
        },
      })
      const clientDispose = register({
        kind: 'exact',
        path: '/agi-federated/client.js',
        handler: (request, response) => {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' })
            response.end('method not allowed')
            return
          }
          response.writeHead(200, {
            'content-type': 'text/javascript; charset=utf-8',
            'cache-control': 'no-store, max-age=0',
            'x-content-type-options': 'nosniff',
          })
          response.end(request.method === 'HEAD' ? undefined : UI_CLIENT_JS)
        },
      })
      let indexDispose = () => undefined
      if (typeof web.tapIndex === 'function') {
        const query = new URLSearchParams({
          poll: String(this.config.ui.pollIntervalMs),
          collapsed: this.config.ui.startCollapsed ? '1' : '0',
          position: this.config.ui.position,
        }).toString()
        const injection = `<script defer src="/agi-federated/client.js?${query}"></script>`
        const dispose = web.tapIndex((html) => {
          try {
            const source = asString(html)
            if (source.includes('/agi-federated/client.js')) return source
            if (source.includes('</head>')) return source.replace('</head>', `${injection}</head>`)
            if (source.includes('</body>')) return source.replace('</body>', `${injection}</body>`)
            return `${source}${injection}`
          } catch {
            return html
          }
        })
        if (typeof dispose === 'function') indexDispose = dispose
      }
      if (typeof this.ctx?.effect === 'function') {
        this.ctx.effect(() => () => {
          try {
            statusDispose()
          } catch {}
          try {
            clientDispose()
          } catch {}
          try {
            indexDispose()
          } catch {}
        })
      }
    } catch (error) {
      this.log.warn(`floating window registration failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.balanceTimer) clearInterval(this.balanceTimer)
    if (this.memorySaveTimer) clearTimeout(this.memorySaveTimer)
    if (this.evidenceSaveTimer) clearTimeout(this.evidenceSaveTimer)
    if (this.checkpointSaveTimer) clearTimeout(this.checkpointSaveTimer)
    if (this.skills?.reviewTimer) clearTimeout(this.skills.reviewTimer)
    for (const timer of this.compactTimers.values()) clearTimeout(timer)
    this.compactTimers.clear()
    for (const stream of this.streams.values()) {
      if (stream.flushTimer) clearTimeout(stream.flushTimer)
      if (stream.fallbackTimer) clearTimeout(stream.fallbackTimer)
    }
    this.streams.clear()
    this.stepStreams.clear()
    for (const dispose of this.agentSections.values()) {
      try {
        dispose()
      } catch {}
    }
    this.agentSections.clear()
    await Promise.allSettled([
      this.saveMemory(),
      this.saveEvidence(),
      this.saveCheckpoints(),
      this.usage.flush(),
    ])
  }
}

/**
 * Cordis Host entry point.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {unknown} rawConfig
 */
export function apply(ctx, rawConfig) {
  const plugin = new AgiFederated(ctx, rawConfig)
  plugin.register()
  return plugin
}

export { normalizeConfig, validateConfig, PLUGIN_ID, PLUGIN_VERSION }
