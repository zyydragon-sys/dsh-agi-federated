/**
 * profile-guard — 保护运行中 profile 的 `package.json` 不被第三方工具改坏。
 *
 * 真实事故（2026-11-02 01:16）：外部 PowerShell 工具重写 profile 清单，
 * 写入 UTF-8 BOM、把 `link:` 路径里的中文变成乱码（`D:/Deepseek宸ヤ綔鍖?`），
 * 结果 Host 组合时插件整体不加载 —— 状态工具消失、REST 404、界面胶囊消失。
 *
 * 本脚本做三件事（都可用开关裁剪）：
 *   1. 校验：BOM、JSON 可解析、`link:` 路径存在、`dsh.profile.bundles` 含关键 bundle；
 *   2. 金样（golden）：校验通过时保存 `package.json.golden` 作为最后已知良好版本；
 *   3. 修复：校验失败时把损坏文件另存为 `package.json.corrupt-<时间戳>`，再用金样覆盖回去。
 *
 * 同用户进程无法被 ACL 彻底拦住（DSH 自己也要写这个文件），所以策略是
 * “**几秒内自愈 + 留证**”，而不是假设可以永久禁止写入。
 *
 * 用法：
 *   node scripts/profile-guard.mjs                     # 只校验（退出码 0/1）
 *   node scripts/profile-guard.mjs --fix               # 失败时用金样修复
 *   node scripts/profile-guard.mjs --golden            # 校验通过时刷新金样
 *   node scripts/profile-guard.mjs --fix --golden      # 定时任务推荐组合
 *   node scripts/profile-guard.mjs --profile <dir>     # 指定 profile 目录（默认 DSH_PROFILE_DIR）
 *   node scripts/profile-guard.mjs --require a,b       # 额外要求包含的 bundle 名
 *   node scripts/profile-guard.mjs --json              # 机器可读输出
 */
import { readFile, writeFile, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const value = (name) => {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

const DEFAULT_REQUIRED = ['dsh-quota-nexus', 'dsh-agi-federated']
const required = (value('--require') ?? DEFAULT_REQUIRED.join(',')).split(',').map((s) => s.trim()).filter(Boolean)
const profileDir =
  value('--profile') ||
  process.env.DSH_PROFILE_DIR ||
  path.join(process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh'), 'profiles', 'desktop')
const manifestPath = path.join(profileDir, 'package.json')
const goldenPath = `${manifestPath}.golden`

/** 校验一份清单字节：返回 { ok, problems[] }。不抛错。 */
export function validateManifest(bytes, { requiredBundles = DEFAULT_REQUIRED, profileDirectory = profileDir } = {}) {
  const problems = []
  if (bytes.length === 0) return { ok: false, problems: ['文件为空'] }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) problems.push('带 UTF-8 BOM（PowerShell 写入特征）')
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, problems: [...problems, '不是合法 UTF-8'] }
  }
  let manifest
  try {
    manifest = JSON.parse(text)
  } catch (error) {
    return { ok: false, problems: [...problems, `JSON 解析失败：${error?.message ?? error}`] }
  }
  // 乱码特征：UTF-8 中文被按 GBK 解码后再写回，典型片段“宸ヤ綔鍖”
  if (/[\uFFFD]|宸ヤ綔鍖|鈥|馃/.test(text)) problems.push('包含乱码字符（中文路径被错误转码）')
  const deps = manifest.dependencies ?? {}
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== 'string' || !spec.startsWith('link:')) continue
    const target = spec.slice(5)
    if (!path.isAbsolute(target) || /[?？]/.test(target)) problems.push(`依赖 ${name} 的 link 路径不可用：${target}`)
  }
  const bundles = manifest?.dsh?.profile?.bundles
  if (!Array.isArray(bundles) || bundles.length === 0) problems.push('缺少 dsh.profile.bundles 列表')
  else {
    for (const name of requiredBundles) {
      if (!bundles.includes(name)) problems.push(`bundles 缺少 ${name}（插件将不加载）`)
    }
  }
  // link 目标若指向工作区，顺手检查目录是否存在（不存在的 link 会让 Host 启动降级）
  const missingTargets = []
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== 'string' || !spec.startsWith('link:')) continue
    const target = spec.slice(5)
    if (!path.isAbsolute(target) || /[?？]/.test(target)) continue
    if (!existsSync(target)) missingTargets.push(`${name} → ${target}`)
  }
  if (missingTargets.length) problems.push(`link 目标不存在：${missingTargets.join('; ')}`)
  return { ok: problems.length === 0, problems, manifest, text }
}

const readBytes = async (file) => {
  try {
    return await readFile(file)
  } catch {
    return null
  }
}

const live = await readBytes(manifestPath)
if (!live) {
  console.error(`读不到 profile 清单：${manifestPath}`)
  process.exit(2)
}

const result = validateManifest(live, { requiredBundles: required, profileDirectory: profileDir })
const report = { profile: profileDir, path: manifestPath, ok: result.ok, problems: result.problems }
if (flag('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else if (result.ok) {
  console.log(`OK — ${manifestPath} 通过校验`)
} else {
  console.log(`FAIL — ${manifestPath}`)
  for (const problem of result.problems) console.log(`  - ${problem}`)
}

let exitCode = result.ok ? 0 : 1

if (result.ok && flag('--golden')) {
  // 只在校验通过时刷新金样，避免把损坏版本固化成“良好”
  await writeFile(goldenPath, live)
  if (!flag('--json')) console.log(`已刷新金样：${goldenPath}`)
}

if (!result.ok && flag('--fix')) {
  const golden = await readBytes(goldenPath)
  if (!golden) {
    console.error(`没有可用金样：${goldenPath}`)
    exitCode = 3
  } else {
    const goldenResult = validateManifest(golden, { requiredBundles: required, profileDirectory: profileDir })
    if (!goldenResult.ok) {
      console.error(`金样本身不合法，拒绝覆盖：${goldenResult.problems.join('; ')}`)
      exitCode = 4
    } else {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const corruptPath = `${manifestPath}.corrupt-${stamp}`
      await rename(manifestPath, corruptPath)
      await writeFile(manifestPath, golden)
      console.log(`已修复：损坏版本留证 ${corruptPath}，已用金样覆盖 ${manifestPath}`)
      exitCode = 0
    }
  }
}

process.exit(exitCode)
