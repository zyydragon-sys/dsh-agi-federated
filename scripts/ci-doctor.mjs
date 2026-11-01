/**
 * ci-doctor — 把 CI 自动开出的 `darwin-ticket` issue 拉回本地，交给 darwin 链路处理。
 *
 * 只读 GitHub，不写入任何 ticket 库、不晋级任何技能：
 *   1. 列出 open 且带 `darwin-ticket` 标签的 issue；
 *   2. 打印每条工单的分支/提交/运行链接与本地复现命令；
 *   3. 可选把清单写到 workspace 的 `.dsh/ci-inbox.json`（在仓库之外，不污染 drift）。
 *
 * 晋级路径始终是人工的：darwin_eval（P2 门，≥80%）→ darwin_promote(confirm:true)。
 *
 * 用法：
 *   node scripts/ci-doctor.mjs                 # 只打印
 *   node scripts/ci-doctor.mjs --json          # 机器可读
 *   node scripts/ci-doctor.mjs --write-inbox   # 另存 <workspace>/.dsh/ci-inbox.json
 *   node scripts/ci-doctor.mjs --fixture x.json # 离线：读本地 issue JSON 数组
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACE = path.dirname(ROOT)
const OWNER = process.env.SYNC_OWNER || 'zyydragon-sys'
const REPO = process.env.SYNC_REPO || 'dsh-agi-federated'
const LABEL = 'darwin-ticket'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const value = (name) => {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

async function fetchIssues() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) throw new Error('缺少 GITHUB_TOKEN/GH_TOKEN：CI 工单需要读私有 issue')
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&labels=${LABEL}&per_page=50`,
    {
      signal: AbortSignal.timeout(30000),
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'dsh-ci-doctor',
        authorization: `Bearer ${token}`,
      },
    },
  )
  if (!response.ok) throw new Error(`GitHub ${response.status} 列出 issue 失败`)
  const rows = await response.json()
  return rows.filter((row) => !row.pull_request)
}

/** 从 issue 正文里抽出分支、提交、运行链接与复现命令（缺失字段只是省略，不编造）。 */
function normalize(issue) {
  const body = String(issue.body ?? '')
  const pick = (pattern) => body.match(pattern)?.[1]?.trim() ?? null
  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    createdAt: issue.created_at,
    branch: pick(/分支：`([^`]+)`/),
    commit: pick(/提交：`([^`]+)`/),
    run: pick(/运行：(\S+)/),
    reproduce: [...body.matchAll(/^```bash\n([\s\S]*?)```/gm)].flatMap((match) =>
      match[1].split('\n').map((line) => line.trim()).filter(Boolean),
    ),
    comments: issue.comments ?? 0,
  }
}

const fixture = value('--fixture')
const issues = fixture
  ? JSON.parse((await readFile(fixture, 'utf8')).replace(/^\uFEFF/, '')).filter((row) => !row.pull_request)
  : await fetchIssues()

const tickets = issues.map(normalize)

if (flag('--json')) {
  console.log(JSON.stringify({ ok: true, owner: OWNER, repo: REPO, label: LABEL, tickets }, null, 2))
} else if (tickets.length === 0) {
  console.log(`没有 open 的 ${LABEL} 工单（${OWNER}/${REPO}）`)
} else {
  console.log(`${OWNER}/${REPO} 有 ${tickets.length} 张 ${LABEL} 工单：\n`)
  for (const ticket of tickets) {
    console.log(`#${ticket.number}  ${ticket.title}`)
    console.log(`  ${ticket.url}`)
    if (ticket.branch) console.log(`  分支：${ticket.branch}`)
    if (ticket.commit) console.log(`  提交：${ticket.commit.slice(0, 12)}`)
    if (ticket.run) console.log(`  运行：${ticket.run}`)
    if (ticket.reproduce.length) {
      console.log('  复现：')
      for (const line of ticket.reproduce) console.log(`    ${line}`)
    }
    console.log('  处置：darwin_scan → darwin_forge → darwin_eval → 人工确认后 darwin_promote')
    console.log('')
  }
}

if (flag('--write-inbox')) {
  const dir = path.join(WORKSPACE, '.dsh')
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, 'ci-inbox.json')
  await writeFile(
    file,
    JSON.stringify({ generatedAt: new Date().toISOString(), owner: OWNER, repo: REPO, tickets }, null, 2) + '\n',
    'utf8',
  )
  console.log(`已写出：${file}`)
}
