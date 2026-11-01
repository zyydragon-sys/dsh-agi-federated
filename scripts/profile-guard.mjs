/**
 * profile-guard — 校验本插件是否仍被 profile 的组合列表收录，避免“插件静默消失”。
 *
 * 背景（真实事故，2026-11-02 01:12）：安装别的插件时 profile 的
 * `dsh.profile.bundles` 被整体重写，`dsh-quota-nexus` 被漏掉，结果 Host 启动后
 * 本插件完全不加载 —— 状态工具消失、`/quota-nexus/api/*` 404、界面上的两个用量胶囊
 * 与设置页一起消失。依赖还在、文件还在，只是没人把它组合进树里。
 *
 * 本脚本只读 profile 的 package.json，判断两件事：
 *   1. `dependencies` 里是否有 `dsh-quota-nexus`；
 *   2. `dsh.profile.bundles` 里是否有 `dsh-quota-nexus`。
 * 任一缺失即退出码 1，并给出 `--fix` 提示。`--fix` 会把缺失项补回去（保留原有顺序）。
 *
 * 用法：
 *   node scripts/profile-guard.mjs
 *   node scripts/profile-guard.mjs --fix
 *   node scripts/profile-guard.mjs --profile "C:/Users/x/.dsh/profiles/desktop"
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PKG = 'dsh-quota-nexus'
const argv = process.argv.slice(2)
const wantFix = argv.includes('--fix')
const profileIndex = argv.indexOf('--profile')
const profileDir =
  profileIndex >= 0
    ? path.resolve(argv[profileIndex + 1])
    : process.env.DSH_PROFILE_DIR || path.join(process.env.DSH_HOME || path.join(homeDir(), '.dsh'), 'profiles', 'desktop')

function homeDir() {
  return process.env.USERPROFILE || process.env.HOME || ''
}

const manifestPath = path.join(profileDir, 'package.json')

let manifest
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch (error) {
  console.error(`读不到 profile 清单：${manifestPath}（${error?.message ?? error}）`)
  process.exit(2)
}

const deps = manifest.dependencies ?? {}
const bundles = manifest?.dsh?.profile?.bundles ?? []

const missingDep = !deps[PKG]
const missingBundle = !bundles.includes(PKG)

const report = {
  profile: profileDir,
  dependency: missingDep ? 'missing' : deps[PKG],
  bundle: missingBundle ? 'missing' : 'listed',
  bundles: bundles.length,
}

if (!missingDep && !missingBundle) {
  console.log(JSON.stringify({ ok: true, ...report }))
  process.exit(0)
}

if (!wantFix) {
  console.log(JSON.stringify({ ok: false, ...report, hint: 'node scripts/profile-guard.mjs --fix' }))
  console.error(`\n[!] ${PKG} 未被 profile 组合：${missingDep ? '缺 dependency' : ''}${missingDep && missingBundle ? '、' : ''}${missingBundle ? '缺 dsh.profile.bundles 条目' : ''}`)
  console.error('    症状：Host 启动后插件不加载——状态工具消失、REST 404、界面胶囊消失。')
  process.exit(1)
}

if (missingDep) deps[PKG] = `link:${path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..').replace(/\\/g, '/')}`
if (missingBundle) bundles.push(PKG)
manifest.dependencies = deps
manifest.dsh = { ...manifest.dsh, profile: { ...(manifest.dsh?.profile ?? {}), bundles } }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ ok: true, fixed: true, ...report, dependency: deps[PKG], bundle: 'listed' }))
