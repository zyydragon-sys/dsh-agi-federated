/**
 * skills-sync — 把项目级技能从活动挂载同步进仓库 `skills/`，让技能随代码一起版本化。
 *
 * 事实关系（不要反过来理解）：
 *   - 活动挂载：`<workspace>/.dsh/skills/<name>/SKILL.md` —— DSH 从这里热加载；
 *   - 版本化副本：`<repo>/skills/<name>/SKILL.md` —— 随 git 发布、可 review、可回滚。
 *   本脚本只做 挂载 → 仓库 的单向镜像；不会写回 `.dsh/skills`。
 *
 * 用法：
 *   node scripts/skills-sync.mjs            # 镜像（缺的补、变的覆盖）
 *   node scripts/skills-sync.mjs --check    # 只校验，不一致时退出码 1（CI 友好）
 *   node scripts/skills-sync.mjs --list     # 列出两边差异
 */
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACE = path.dirname(REPO_ROOT)
const LIVE_ROOT = path.join(WORKSPACE, '.dsh', 'skills')
const ARCHIVE_ROOT = path.join(REPO_ROOT, 'skills')

const argv = process.argv.slice(2)
const checkOnly = argv.includes('--check')
const listOnly = argv.includes('--list')

async function walk(dir, prefix = '') {
  const out = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name)
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...(await walk(absolute, relative)))
    else if (entry.isFile()) out.push({ absolute, relative })
  }
  return out
}

const liveFiles = await walk(LIVE_ROOT)
if (liveFiles.length === 0) {
  console.log(`活动挂载为空或不存在：${LIVE_ROOT}`)
  process.exit(0)
}

const archiveFiles = new Map()
for (const file of await walk(ARCHIVE_ROOT)) {
  // README 属于仓库自己的说明，不参与镜像
  if (file.relative === 'README.md') continue
  archiveFiles.set(file.relative, file)
}

const added = []
const changed = []
const same = []
for (const file of liveFiles) {
  const target = archiveFiles.get(file.relative)
  if (!target) {
    added.push(file)
    continue
  }
  const [a, b] = await Promise.all([readFile(file.absolute), readFile(target.absolute)])
  if (a.equals(b)) same.push(file.relative)
  else changed.push({ file, target })
}

const removed = [...archiveFiles.keys()].filter((relative) => !liveFiles.some((file) => file.relative === relative))

if (listOnly) {
  console.log(JSON.stringify({ live: LIVE_ROOT, archive: ARCHIVE_ROOT, added: added.map((f) => f.relative), changed: changed.map((c) => c.file.relative), removed, same: same.length }, null, 2))
  process.exit(0)
}

if (checkOnly) {
  const drift = added.length + changed.length + removed.length
  if (drift === 0) {
    console.log(`OK — skills/ 与活动挂载一致（${same.length} 个文件）`)
    process.exit(0)
  }
  console.log(`DRIFT — added=${added.length} changed=${changed.length} removed=${removed.length}`)
  for (const file of added) console.log(`  + ${file.relative}`)
  for (const entry of changed) console.log(`  ~ ${entry.file.relative}`)
  for (const relative of removed) console.log(`  - ${relative}`)
  process.exit(1)
}

for (const file of [...added, ...changed.map((entry) => entry.file)]) {
  const target = path.join(ARCHIVE_ROOT, file.relative)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, await readFile(file.absolute))
}

console.log(
  `skills-sync: 新增 ${added.length}、更新 ${changed.length}、未变 ${same.length}` +
    (removed.length ? `；仓库里多出 ${removed.length} 个挂载中不存在的文件（未删除，需人工确认）` : ''),
)
for (const relative of removed) console.log(`  仅仓库存在：skills/${relative}`)
