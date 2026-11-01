/**
 * preflight — 发布前的“不崩盘”闸门。任何一项失败即退出码 1，发布脚本据此中止。
 *
 * 为什么需要它：真实事故里最小的失误（未用到的 `writeFile` 未导入、`plan` 变量漏定义、
 * profile 清单被截断）都能让 Host 启动失败、整个插件消失。发布前把这些确定性检查跑一遍，
 * 比事后从崩溃日志里考古便宜得多。
 *
 * 检查顺序（失败即停，全部失败也会汇总）：
 *   1. 语法：node --check 所有入口与脚本；
 *   2. 插件自检：`node plugins/dsh-quota-nexus/scripts/selftest.mjs`（spawnSync，stdio inherit）；
 *   3. 无头装配：quota-nexus 与 agi-federated 的 apply 能在桩 ctx 上完成、不抛错、不返回悬挂 Promise；
 *   4. profile 清单：JSON 可解析、无 BOM、bundles 含关键条目；
 *   5. 客户端渲染：client.js 工厂 + 全部槽位组件渲染不抛错。
 *
 * 用法：
 *   node scripts/preflight.mjs
 *   node scripts/preflight.mjs --verbose
 */
import { readFile, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')
const failures = []
const notes = []

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/')
const ok = (message) => {
  if (verbose) console.log('  ok   ' + message)
}
const fail = (message) => {
  failures.push(message)
  console.log('  FAIL ' + message)
}

const isScriptFile = (name) => name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.cjs')

async function listScripts(dir, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'skills') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await listScripts(full, out)
    else if (isScriptFile(entry.name)) out.push(full)
  }
  return out
}

console.log('preflight')

// 1) 语法
const targets = [
  ...(await listScripts(path.join(ROOT, 'plugins', 'dsh-quota-nexus'))),
  ...(await listScripts(path.join(ROOT, 'scripts'))),
  path.join(ROOT, 'index.js'),
  path.join(ROOT, 'client.js'),
  path.join(ROOT, 'schemas', 'config.js'),
]
for (const file of targets) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'ignore' })
  if (result.status === 0) ok('syntax ' + rel(file))
  else fail('syntax ' + rel(file))
}

// 2) 插件自检（stdio inherit：沙箱里 piped stdio 会 EPERM）
if (failures.length === 0) {
  const pluginDir = path.join(ROOT, 'plugins', 'dsh-quota-nexus')
  const result = spawnSync(process.execPath, [path.join(pluginDir, 'scripts', 'selftest.mjs')], { stdio: 'inherit', cwd: pluginDir })
  if (result.status === 0) ok('plugin selftest')
  else fail('plugin selftest')
}

// 3) 无头装配
if (failures.length === 0) {
  const stubCtx = () => ({
    tools: { register: () => () => {} },
    effect: (fn) => {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    get: () => undefined,
    provide: () => {},
    set: () => {},
    on: () => {},
    waterfall: () => {},
    inject: () => () => {},
  })
  const entries = [
    { name: 'dsh-quota-nexus', file: path.join(ROOT, 'plugins', 'dsh-quota-nexus', 'index.js') },
    { name: 'dsh-agi-federated', file: path.join(ROOT, 'index.js') },
  ]
  for (const entry of entries) {
    try {
      const mod = await import(pathToFileURL(entry.file).href)
      if (typeof mod.apply !== 'function') {
        fail(entry.name + ': 没有导出 apply')
        continue
      }
      const result = mod.apply(stubCtx(), {})
      if (result && typeof result.then === 'function') {
        const raced = await Promise.race([
          result.then(() => 'resolved').catch((error) => 'rejected:' + (error?.message ?? error)),
          new Promise((resolve) => setTimeout(() => resolve('timeout'), 3000)),
        ])
        if (raced !== 'resolved') fail(entry.name + ': apply 返回悬挂 Promise（' + raced + '）')
        else ok(entry.name + ': apply（async）')
      } else {
        ok(entry.name + ': apply（sync）')
      }
    } catch (error) {
      fail(entry.name + ': apply 抛错 ' + String(error?.message ?? error).slice(0, 200))
    }
  }
}

// 4) profile 清单
if (failures.length === 0) {
  const homeDir = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh')
  const profileDir = process.env.DSH_PROFILE_DIR || path.join(homeDir, 'profiles', 'desktop')
  const manifestPath = path.join(profileDir, 'package.json')
  try {
    const bytes = await readFile(manifestPath)
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('profile: 带 BOM')
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const manifest = JSON.parse(text)
    const bundles = manifest?.dsh?.profile?.bundles ?? []
    if (bundles.length === 0) fail('profile: bundles 为空')
    for (const name of ['dsh-quota-nexus']) {
      if (!bundles.includes(name)) fail('profile: bundles 缺少 ' + name)
      else ok('profile: ' + name + ' 已收录')
    }
  } catch (error) {
    fail('profile: 读取/解析失败 ' + String(error?.message ?? error).slice(0, 160))
  }
}

// 5) 客户端渲染
if (failures.length === 0) {
  try {
    const { createContext, runInContext } = await import('node:vm')
    const source = await readFile(path.join(ROOT, 'plugins', 'dsh-quota-nexus', 'client.js'), 'utf8')
    let spec = null
    const sandbox = {
      window: { __ModuleLoader__: { load: (received) => (spec = received) }, location: { reload: () => {} } },
      sessionStorage: { getItem: () => null, setItem: () => {} },
      console,
      TextDecoder,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
    }
    runInContext(source, createContext(sandbox), { filename: 'client.js' })
    if (!spec || typeof spec.factory !== 'function') throw new Error('客户端工厂缺失')
    const React = {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {},
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
      useRef: (value) => ({ current: value }),
    }
    const mod = spec.factory(() => React)
    const registered = []
    mod.apply({
      effect: (fn) => {
        const dispose = fn()
        return typeof dispose === 'function' ? dispose : () => {}
      },
      get: () => undefined,
      slots: { inject: (name, cb) => registered.push(cb()), register: (options, component) => (registered.push({ options, component }), () => {}) },
    })
    let rendered = 0
    for (const entry of registered) {
      if (typeof entry?.component !== 'function') continue
      entry.component({ close: () => {}, wide: true })
      rendered += 1
    }
    if (rendered === 0) fail('client: 没有可渲染组件')
    else ok('client: ' + rendered + ' 个组件渲染通过')
  } catch (error) {
    fail('client: 渲染失败 ' + String(error?.message ?? error).slice(0, 200))
  }
}

if (failures.length) {
  console.log('\npreflight FAILED — ' + failures.length + ' 项')
  for (const message of failures) console.log('  - ' + message)
  process.exit(1)
}
for (const note of notes) console.log('  note ' + note)
console.log('\npreflight OK — 可以发布')
