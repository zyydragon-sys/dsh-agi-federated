/**
 * dsh-quota-nexus 自检脚本（无第三方依赖，直接 node 运行）。
 *
 * 覆盖：计费时段、价格折算（含 MiniMax 人民币价）、用量提取、路由归属、
 * 能力相容、币种换算、配置归一化，以及模块可加载性。
 * 任何一条失败都以非 0 退出码结束，可直接当 `npm test` 用。
 */

import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { normalizeConfig } from '../schemas/config.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const moduleUrl = pathToFileURL(join(here, '..', 'index.js')).href

const results = []
const test = async (name, fn) => {
  try {
    await fn()
    results.push({ name, ok: true })
  } catch (error) {
    results.push({ name, ok: false, error: error?.message ?? String(error) })
  }
}

// ---------------------------------------------------------------- 配置
const config = normalizeConfig({})
await test('config: 默认开启轮转，空闲判定与用量轮询有默认值', () => {
  assert.equal(config.rotationEnabled, true)
  assert.equal(config.rotationIdleOnly, true)
  assert.equal(config.rotationIdleWindowMs, 120000)
  assert.equal(config.usageSyncMs, 5000)
  assert.equal(config.rotationMinContext, 131072)
})

await test('config: 非法值被夹回区间', () => {
  const clamped = normalizeConfig({ rotationIdleWindowMs: 1, usageSyncMs: 10, rotationMinContext: 1 })
  assert.equal(clamped.rotationIdleWindowMs, 30000)
  assert.equal(clamped.usageSyncMs, 2000)
  assert.equal(clamped.rotationMinContext, 8192)
})

// ---------------------------------------------------------------- 模块加载
const mod = await import(moduleUrl)
const runtimeHolder = []
const ctx = {
  tools: { register: () => () => {} },
  effect: (fn) => {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  get: () => undefined,
  provide: () => {},
  set: (name, value) => runtimeHolder.push(value),
  on: () => {},
  waterfall: () => {},
}
const root = join(here, '..', '.selftest-state')
await rm(root, { recursive: true, force: true })
await mkdir(root, { recursive: true })

await test('module: 可加载并构造运行时', async () => {
  mod.apply(ctx, { persistenceRoot: root })
  const runtime = runtimeHolder.at(-1)
  assert.ok(runtime, '运行时未创建')
  assert.equal(typeof runtime.syncSessionUsage, 'function')
  assert.equal(typeof runtime.applyRotationStep, 'function')
  assert.equal(typeof runtime.money, 'function')
})

const runtime = runtimeHolder.at(-1)
await runtime.ready

await test('money: USD 按汇率换算成人民币并保留 4 位', () => {
  runtime.currency.usdToCnyRate = 7.1
  const view = runtime.money(0.01)
  assert.equal(view.currency, 'CNY')
  assert.equal(view.amount, 0.071)
  assert.equal(view.text, '0.0710')
})

await test('money: 零成本不显示成 0.0000 以外的格式', () => {
  assert.equal(runtime.money(0).text, '0')
})

await test('money: 汇率变化立即反映', () => {
  runtime.currency.usdToCnyRate = 10
  assert.equal(runtime.money(1).amount, 10)
  runtime.currency.usdToCnyRate = 7.1
})

// ---------------------------------------------------------------- 纯函数（经由运行时/模块）
await test('pricing: deepseek 高峰/空闲价可从快照算出', () => {
  const peak = mod.estimateCost('deepseek', 'deepseek-flash', { input: 1_000_000, output: 1_000_000, cached: 0 }, Date.UTC(2026, 10, 2, 2), [], 'peak')
  const offpeak = mod.estimateCost('deepseek', 'deepseek-flash', { input: 1_000_000, output: 1_000_000, cached: 0 }, Date.UTC(2026, 10, 2, 2), [], 'offpeak')
  assert.ok(Math.abs(peak - (0.3 + 1.2)) < 1e-9, `peak=${peak}`)
  assert.ok(Math.abs(offpeak - (0.15 + 0.6)) < 1e-9, `offpeak=${offpeak}`)
  assert.ok(offpeak < peak)
})

await test('pricing: MiniMax 人民币价折算后成本非空（M3 输入 2.1 元/百万）', () => {
  const cost = mod.estimateCost('minimax-cn', 'MiniMax-M3', { input: 1_000_000, output: 0, cached: 0 }, Date.UTC(2026, 10, 2, 2), [], 'offpeak')
  assert.ok(cost !== null, 'MiniMax-M3 应能估算')
  // 2.1 元 ÷ 7.1 ≈ 0.2958 USD
  assert.ok(Math.abs(cost - 2.1 / 7.1) < 1e-6, `cost=${cost}`)
})

await test('pricing: 未知模型返回 null 而不是瞎编', () => {
  assert.equal(mod.estimateCost('minimax-cn', 'MiniMax-M2.7-highspeed', { input: 1, output: 1, cached: 0 }, Date.now(), [], 'peak'), null)
})

await test('vendorIdOfRoute: 路由前缀映射到厂商', () => {
  assert.equal(mod.vendorIdOfRoute('deepseek-official'), 'deepseek')
  assert.equal(mod.vendorIdOfRoute('deepseek-account'), 'deepseek')
  assert.equal(mod.vendorIdOfRoute('minimax-cn'), 'minimax-cn')
  assert.equal(mod.vendorIdOfRoute('unknown-route'), null)
})

await test('extractUsage: 兼容多种字段命名与嵌套', () => {
  const flat = mod.extractUsage({ input_tokens: 10, output_tokens: 20, cached_tokens: 5 })
  assert.deepEqual({ input: flat.input, output: flat.output, cached: flat.cached }, { input: 10, output: 20, cached: 5 })
  const openai = mod.extractUsage({ usage: { prompt_tokens: 7, completion_tokens: 3, prompt_tokens_details: { cached_tokens: 2 } } })
  assert.deepEqual({ input: openai.input, output: openai.output, cached: openai.cached }, { input: 7, output: 3, cached: 2 })
  assert.equal(mod.extractUsage({ type: 'text', text: 'hi' }), null)
})

await test('mergeUsage: 取各字段最大值', () => {
  const merged = mod.mergeUsage({ input: 1, output: 2, cached: 3, total: 3 }, { input: 9, output: 1, cached: 0, total: 10 })
  assert.deepEqual(merged, { input: 9, output: 2, cached: 3, total: 10 })
})

await test('rotation: 能力相容不降级 reasoning，不收窄上下文下限', () => {
    const current = { reasoning: true, contextWindow: 1048576, vision: false }
  assert.equal(mod.compatible(current, { reasoning: false, contextWindow: 1048576, vision: false }), false)
  assert.equal(mod.compatible(current, { reasoning: true, contextWindow: 204800, vision: false }), true)
  assert.equal(mod.compatible(current, { reasoning: true, contextWindow: 65536, vision: false }), false)
  assert.equal(mod.compatible({ reasoning: true, contextWindow: 1048576, vision: true }, { reasoning: true, contextWindow: 1048576, vision: false }, 131072, true), false)
})

const seedProvider = () => {
  const record = { id: 'selftest-provider', vendorId: 'deepseek', label: 'DeepSeek', enabled: true, models: ['deepseek-flash'], plan: null, quota: {}, billing: {}, credential: {} }
  runtime.providers.set(record.id, record)
  const rt = {
    id: record.id,
    record,
    events: [],
    usage: { requests: 0, tokens: 0, resetsAtWall: null },
    quota: { ratio: null, resetsAtWall: null },
    plan: null,
  }
  runtime.scheduler.accounts.set(record.id, rt)
  return { record, rt }
}

await test('usage: 合成事件能聚合出 token/缓存命中/人民币成本', () => {
  const { record, rt } = seedProvider()
  rt.events.push({ t: Date.now(), model: 'deepseek-flash', tokens: 3000, input: 1000, output: 2000, cached: 0, session: 's', endpoint: 'deepseek-account', source: 'test' })
  const summary = runtime.usageSummary({ range: 'day' })
  const row = summary.providers.find((entry) => entry.providerId === record.id)
  assert.ok(row.totals.requests >= 1)
  assert.ok(row.totals.tokens >= 3000)
  assert.equal(row.totals.costCurrency, 'CNY')
  assert.ok(Number.isFinite(row.totals.costAmount))
  const model = row.costByModel.find((entry) => entry.model === 'deepseek-flash')
  assert.ok(model && Number.isFinite(model.costCny), '模型级 CNY 成本缺失')
})

await test('usage: 缓存命中率按 cached/(input+cached) 计算', () => {
  const { record, rt } = seedProvider()
  rt.events.length = 0
  rt.events.push({ t: Date.now(), model: 'deepseek-flash', tokens: 100, input: 25, output: 75, cached: 75, session: 's', endpoint: 'e', source: 'test' })
  const row = runtime.usageSummary({ range: 'day' }).providers.find((entry) => entry.providerId === record.id)
  assert.equal(row.totals.cacheHitRate, 75)
})

await test('rotation: 最近有用量时跳过切换（空闲保护）', async () => {
  runtime.lastUsageAt = Date.now()
  runtime.config.rotationIdleOnly = true
  runtime.config.rotationIdleWindowMs = 120000
  const result = await runtime.applyRotationStep()
  assert.equal(result.ok, false)
  assert.equal(result.code, 'quota_nexus_busy_recent_usage')
})

await runtime.stop()
await rm(root, { recursive: true, force: true })

// ---------------------------------------------------------------- 汇总
const failed = results.filter((entry) => !entry.ok)
for (const entry of results) {
  console.log(`${entry.ok ? 'PASS' : 'FAIL'}  ${entry.name}${entry.ok ? '' : `  →  ${entry.error}`}`)
}
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length === 0 ? 0 : 1)
