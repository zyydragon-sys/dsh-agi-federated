import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * 多智能体工作台 · 模板集 v3：整篇内容只保存在插件包内的一个文件
 * assets/workbench-templates-v3.md。本模块不拆分章节、不生成多个配置项，只提供：
 *   1. workbench_templates 工具——默认返回全文，可选按「第X节」或关键词取节；
 *   2. 只读内容路由——给左侧栏面板（client.js）读取同一个文件。
 */
const DOC_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'workbench-templates-v3.md')
const DOC_ROUTE = '/workbench-templates/v3.md'
const LIVE_ROUTE = '/workbench-templates/live'
const STREAM_ROUTE = '/workbench-templates/stream'
const ARCHIVE_ROUTE = '/workbench-templates/archive/delete'
const STREAM_INTERVAL_MS = 500

const SECTION_HEAD = /^第[〇一二三四五六七八九十0-9]+节/

const DIGIT_TO_CN = { 0: '〇', 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十' }

function normalizeSectionQuery(query) {
  return query.replace(/第([0-9]+)节/g, (whole, digits) => {
    const number = Number(digits)
    return '第' + (DIGIT_TO_CN[number] || digits) + '节'
  }).trim()
}

function listSections(text) {
  const lines = text.split('\n')
  const offsets = [0]
  for (let i = 0; i < lines.length; i += 1) offsets.push(offsets[i] + lines[i].length + 1)
  const marks = []
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (SECTION_HEAD.test(trimmed)) marks.push({ heading: trimmed, lineIndex: i })
  }
  return marks.map((mark, index) => ({
    heading: mark.heading,
    start: offsets[mark.lineIndex],
    end: index + 1 < marks.length ? offsets[marks[index + 1].lineIndex] : text.length,
  }))
}

export const name = 'dsh-workbench-templates'
export const inject = ['tools']

// ---- live runtime snapshot ------------------------------------------------
// Everything below reads optional Host services defensively: a profile without
// Agent Teams, background jobs, or a live Lead still gets a valid snapshot.

function asCount(value) {
  return typeof value === 'number' && isFinite(value) ? value : null
}

function readTeamView(teams, lead, membership) {
  let members = []
  try {
    const rows = typeof teams.listMembers === 'function' ? teams.listMembers(lead) : []
    members = (Array.isArray(rows) ? rows : []).map((member) => ({
      name: member && typeof member.name === 'string' ? member.name : '',
      role: member && member.role === 'lead' ? 'lead' : 'teammate',
      status: member && typeof member.status === 'string' ? member.status : 'inactive',
      model: member && typeof member.model === 'string' ? member.model : null,
    }))
  } catch (error) {
    members = []
  }
  const counts = { running: 0, inactive: 0, provisioning: 0, failed: 0 }
  for (let i = 0; i < members.length; i += 1) {
    if (counts[members[i].status] !== undefined) counts[members[i].status] += 1
  }
  let tasks = null
  let taskRows = []
  try {
    const rows = typeof teams.listTasks === 'function' ? teams.listTasks(lead) : []
    taskRows = Array.isArray(rows) ? rows : []
    const summary = { total: 0, pending: 0, inProgress: 0, completed: 0, ready: 0, items: [], archive: [] }
    for (let i = 0; i < taskRows.length; i += 1) {
      const task = taskRows[i]
      if (!task || task.status === 'deleted') continue
      summary.total += 1
      if (task.status === 'pending') summary.pending += 1
      else if (task.status === 'in_progress') summary.inProgress += 1
      else if (task.status === 'completed') summary.completed += 1
      if (task.ready === true) summary.ready += 1
      // Only unfinished work belongs on the board; completed tasks are archived
      // by count so the board clears itself as soon as a task is finished.
      if (task.status === 'pending' || task.status === 'in_progress') {
        if (summary.items.length < 8) {
          summary.items.push({
            subject: typeof task.subject === 'string' ? task.subject.slice(0, 80) : '',
            status: typeof task.status === 'string' ? task.status : 'pending',
            owner: typeof task.ownerName === 'string' ? task.ownerName : null,
            ready: task.ready === true,
          })
        }
      } else if (task.status === 'completed' && summary.archive.length < 20) {
        summary.archive.push({
          id: String(task.id),
          revision: typeof task.revision === 'number' ? task.revision : null,
          subject: typeof task.subject === 'string' ? task.subject.slice(0, 80) : '',
          owner: typeof task.ownerName === 'string' ? task.ownerName : null,
        })
      }
    }
    tasks = summary
  } catch (error) {
    tasks = null
  }
  const taskCounts = {}
  for (let i = 0; i < taskRows.length; i += 1) {
    const task = taskRows[i]
    if (!task || task.status === 'deleted') continue
    if (task.status !== 'pending' && task.status !== 'in_progress') continue
    const owner = typeof task.ownerName === 'string' ? task.ownerName : ''
    if (owner) taskCounts[owner] = (taskCounts[owner] || 0) + 1
  }
  const enriched = members.map((member) => ({ ...member, tasks: taskCounts[member.name] || 0 }))
  const score =
    (tasks ? tasks.total * 2 : 0)
    + enriched.length
    + (counts.running > 0 ? 1 : 0)
  return {
    score: score,
    view: {
      id: membership && membership.id ? String(membership.id).slice(0, 8) : null,
      name: membership && typeof membership.name === 'string' ? membership.name : null,
      members: enriched.slice(0, 16),
      counts: counts,
      tasks: tasks,
    },
  }
}

// Show the Team that is actually doing work: several root sessions can each lead
// their own Team, so pick by task count, roster size, and running members. The
// same selector feeds the dashboard and the archive-delete endpoint.
function selectTeam(ctx) {
  const teams = ctx.get('agentTeams')
  if (!teams || typeof teams.tryMembership !== 'function') return null
  let agents = []
  try {
    const service = ctx.get('agents')
    if (service && typeof service.list === 'function') agents = service.list()
  } catch (error) {
    agents = []
  }
  if (agents.length === 0) return null
  const seen = new Set()
  let best = null
  for (let i = 0; i < agents.length; i += 1) {
    let membership = null
    try {
      membership = teams.tryMembership(agents[i])
    } catch (error) {
      membership = null
    }
    if (!membership || membership.role !== 'lead') continue
    const key = String(membership.id || '')
    if (seen.has(key)) continue
    seen.add(key)
    const candidate = readTeamView(teams, agents[i], membership)
    if (candidate && (best === null || candidate.score > best.score)) {
      best = { lead: agents[i], teams: teams, score: candidate.score, view: candidate.view }
    }
  }
  return best
}

function collectTeam(ctx) {
  const best = selectTeam(ctx)
  return best ? best.view : null
}

// Token measurement replays a session surface; cache per session log revision so
// a poll only re-measures sessions that actually appended events.
const tokenCache = new Map()
let snapshotTokenError = null

function collectTokens(ctx, sessions) {
  const meter = ctx.get('tokenMeter')
  if (!meter || typeof meter.measure !== 'function') return null
  const live = new Set()
  const detail = []
  let total = 0
  let peak = 0
  let measured = 0
  let nodes = 0
  let contextWindow = null
  let model = null
  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i]
    if (!session || typeof session.id !== 'string') continue
    live.add(session.id)
    let tokens = null
    try {
      const revision = typeof session.seq === 'number' ? session.seq : null
      const cached = tokenCache.get(session.id)
      let sessionNodes = 0
      if (cached && revision !== null && cached.revision === revision) {
        tokens = cached.tokens
        sessionNodes = typeof cached.nodes === 'number' ? cached.nodes : 0
      } else {
        const measurement = meter.measure(session)
        tokens = typeof measurement.totalTokens === 'number' ? measurement.totalTokens : null
        sessionNodes = measurement && Array.isArray(measurement.nodes) ? measurement.nodes.length : 0
        if (tokens !== null) tokenCache.set(session.id, { revision: revision, tokens: tokens, nodes: sessionNodes })
      }
      if (sessionNodes > nodes) nodes = sessionNodes
    } catch (error) {
      tokens = null
      snapshotTokenError = error && error.message ? error.message : String(error)
    }
    if (tokens !== null) {
      total += tokens
      if (tokens > peak) peak = tokens
      measured += 1
      if (detail.length < 8) detail.push({ id: session.id.slice(-6), tokens: tokens })
    }
    try {
      const context = typeof session.requestContext === 'function' ? session.requestContext() : null
      if (context && typeof context.contextWindow === 'number' && context.contextWindow > 0) {
        contextWindow = contextWindow === null ? context.contextWindow : Math.max(contextWindow, context.contextWindow)
      }
      if (context && typeof context.model === 'string') model = context.model
    } catch (error) {
      /* optional projection */
    }
  }
  for (const id of tokenCache.keys()) {
    if (!live.has(id)) tokenCache.delete(id)
  }
  if (measured === 0) return null
  return {
    total: total,
    peak: peak,
    measured: measured,
    nodes: nodes,
    contextWindow: contextWindow,
    model: model,
    sessions: detail,
  }
}

function findTeamLead(ctx) {
  const best = selectTeam(ctx)
  return best ? { lead: best.lead, teams: best.teams, score: best.score } : null
}

let archiveDeleting = false

function readJsonBody(req, limitBytes) {
  return new Promise((resolve) => {
    let settled = false
    const done = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limitBytes) {
        done({ error: 'request body too large' })
        try {
          req.destroy()
        } catch (error) {
          /* already gone */
        }
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      const text = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : ''
      if (text.trim() === '') {
        done({ value: {} })
        return
      }
      try {
        const parsed = JSON.parse(text)
        done({ value: parsed && typeof parsed === 'object' ? parsed : {} })
      } catch (error) {
        done({ error: 'invalid json body' })
      }
    })
    req.on('error', () => done({ error: 'body read error' }))
    req.on('aborted', () => done({ error: 'request aborted' }))
  })
}

function collectLive(ctx) {
  snapshotTokenError = null
  const snapshot = {
    time: Date.now(),
    uptime: Math.round(process.uptime()),
    memory: null,
    sessions: null,
    agents: null,
    team: null,
    jobs: null,
    tokens: null,
    tools: null,
    eventsTotal: 0,
    sessionList: [],
  }
  try {
    const memory = process.memoryUsage()
    snapshot.memory = { rss: memory.rss, heapUsed: memory.heapUsed, heapTotal: memory.heapTotal }
  } catch (error) {
    snapshot.memory = null
  }
  let sessionList = []
  try {
    const store = ctx.get('sessions')
    if (store && typeof store.list === 'function') {
      sessionList = store.list()
      snapshot.sessions = sessionList.length
    }
  } catch (error) {
    snapshot.sessions = null
  }
  let agents = []
  try {
    const service = ctx.get('agents')
    if (service && typeof service.list === 'function') {
      agents = service.list()
      let roots = []
      try {
        roots = typeof service.roots === 'function' ? service.roots() : agents
      } catch (error) {
        roots = agents
      }
      snapshot.agents = {
        total: asCount(agents.length) || 0,
        roots: asCount(roots.length) || 0,
        children: Math.max(0, agents.length - roots.length),
      }
    }
  } catch (error) {
    snapshot.agents = null
  }
  try {
    snapshot.team = collectTeam(ctx)
  } catch (error) {
    snapshot.team = null
  }
  try {
    const jobs = ctx.get('jobs')
    if (jobs && typeof jobs.list === 'function') {
      const rows = jobs.list()
      let running = 0
      for (let i = 0; i < rows.length; i += 1) {
        const status = rows[i] && typeof rows[i].status === 'string' ? rows[i].status : ''
        if (status === 'running') running += 1
      }
      snapshot.jobs = { total: rows.length, running: running }
    }
  } catch (error) {
    snapshot.jobs = null
  }
  try {
    snapshot.tokens = collectTokens(ctx, sessionList)
  } catch (error) {
    snapshot.tokens = null
    snapshotTokenError = error && error.message ? error.message : String(error)
  }
  snapshot.tokenError = snapshotTokenError
  try {
    const tools = ctx.get('tools')
    const schemas = tools && typeof tools.schemas === 'function' ? tools.schemas() : null
    snapshot.tools = Array.isArray(schemas) ? schemas.length : null
  } catch (error) {
    snapshot.tools = null
  }
  const tokenDetail = snapshot.tokens && Array.isArray(snapshot.tokens.sessions) ? snapshot.tokens.sessions : []
  const tokenById = new Map()
  for (let i = 0; i < tokenDetail.length; i += 1) tokenById.set(tokenDetail[i].id, tokenDetail[i].tokens)
  let eventsTotal = 0
  for (let i = 0; i < sessionList.length; i += 1) {
    const session = sessionList[i]
    if (!session || typeof session.id !== 'string') continue
    const shortId = session.id.slice(-6)
    const events = typeof session.seq === 'number' ? session.seq : null
    if (events !== null) eventsTotal += events
    if (snapshot.sessionList.length < 8) {
      snapshot.sessionList.push({
        id: shortId,
        events: events,
        tokens: tokenById.has(shortId) ? tokenById.get(shortId) : null,
      })
    }
  }
  snapshot.eventsTotal = eventsTotal
  return snapshot
}

export function apply(ctx) {
  let cached = null
  const load = () => {
    if (cached === null) cached = readFileSync(DOC_PATH, 'utf8')
    return cached
  }

  ctx.effect(() => ctx.tools.register({
    name: 'workbench_templates',
    description:
      '读取《多智能体工作台 · 模板集 v3（规模化 × 省 Token × 长效记忆 增强版）》全文。'
      + '内容覆盖：规模化架构（三层指挥树 Lead→SubLead→成员、10-30+ Agent 规模守则、分片原则、工件介质通信与目录约定、Lead/SubLead 分工表）、'
      + 'Token 经济学（GA 四机制：上下文信息密度最大化、最小原子工具集、SOP 自进化、上下文压缩门，模型分层路由、Token 预算条）、'
      + 'L0-L4 分层长效记忆（元记忆/索引/事实/程序/轨迹、磁盘结构、写回协议、召回顺序、维护规则）、'
      + 'Lead/SubLead/成员提示词增量块、v3 验收清单（规模化/Token/记忆/可靠四组）。'
      + '默认一次返回全文，不拆分、不做过滤；传入 section 可只取某一节或含某关键词的节。'
      + 'GUI 左侧栏另有「多智能体工作台」面板可查看同一份全文。'
      + '在组建多智能体团队、规划分层指挥树、压缩 token 消耗、设计长效记忆与 SOP、审查多智能体验收清单前调用。',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          description: '可选。只取某一节：如 "第〇节"、"第三节"、"第3节"，或关键词如 "SOP"、"记忆"、"Handoff"；省略则返回全文。',
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: '返回的模板内容（Markdown / 纯文本），未命中关键词时为提示与可用章节列表。' },
          path: { type: 'string', description: '单一内容文件在磁盘上的绝对路径，可用 read 工具分段复查。' },
          sections: {
            type: 'array',
            items: { type: 'string' },
            description: '文档中全部章节标题（按下标顺序）。',
          },
        },
        required: ['content', 'path', 'sections'],
        additionalProperties: false,
      },
      render(_args, value) {
        return [{ type: 'text', text: value.content }]
      },
    },
    async execute(args) {
      let text
      try {
        text = load()
      } catch (error) {
        throw new Error('无法读取模板集文件 ' + DOC_PATH + '：' + (error && error.message ? error.message : String(error)))
      }
      const sections = listSections(text)
      const headings = sections.map((entry) => entry.heading)
      const rawQuery = args && typeof args.section === 'string' ? args.section.trim() : ''
      if (rawQuery === '') {
        return { content: text, path: DOC_PATH, sections: headings }
      }
      const query = normalizeSectionQuery(rawQuery)
      const matched = sections.filter((entry) => entry.heading.indexOf(query) !== -1)
      if (matched.length === 0) {
        return {
          content: '未找到与「' + rawQuery + '」匹配的章节。可用的章节：' + headings.join(' / ')
            + '。全文共 ' + text.length + ' 字符，可省略 section 读取全文。',
          path: DOC_PATH,
          sections: headings,
        }
      }
      return {
        content: matched.map((entry) => text.slice(entry.start, entry.end).replace(/\s+$/, '')).join('\n\n'),
        path: DOC_PATH,
        sections: headings,
      }
    },
    isConcurrencySafe() {
      return true
    },
  }))

  // 面板用只读路由：读的是与工具完全相同的单一文件，不复制、不拆分。
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: DOC_ROUTE,
      handler(req, res) {
        const headers = {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        }
        let text
        try {
          text = load()
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end('无法读取模板集文件：' + (error && error.message ? error.message : String(error)))
          return
        }
        res.writeHead(200, headers)
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        res.end(text)
      },
    }))

    // 实时快照路由：面板每 2 秒轮询一次，用于「实时运行」仪表。
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: LIVE_ROUTE,
      handler(req, res) {
        let body
        try {
          body = JSON.stringify(collectLive(webCtx))
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify({ error: error && error.message ? error.message : String(error) }))
          return
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        })
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        res.end(body)
      },
    }))

    // 归档清理：只删除已完成的 Team 任务。可带 { id, revision } 删除单条，
    // 省略 id 则清空全部归档；逐条 CAS，失败不影响其它条目，永远返回 JSON。
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: ARCHIVE_ROUTE,
      async handler(req, res) {
        const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        const reply = (status, payload) => {
          if (res.writableEnded) return
          try {
            res.writeHead(status, headers)
            res.end(JSON.stringify(payload))
          } catch (error) {
            /* client already gone */
          }
        }
        try {
          if (req.method !== 'POST') {
            reply(405, { error: 'POST required' })
            return
          }
          if (archiveDeleting) {
            reply(429, { error: 'another archive delete is running' })
            return
          }
          archiveDeleting = true
          try {
            const body = await readJsonBody(req, 4096)
            if (body && body.error) {
              reply(400, { error: body.error })
              return
            }
            const payload = body && body.value && typeof body.value === 'object' ? body.value : {}
            const requestedId =
              typeof payload.id === 'string' && payload.id.length > 0 && payload.id.length <= 64 ? payload.id : null
            const expectedRevision =
              typeof payload.revision === 'number' && isFinite(payload.revision) ? payload.revision : null
            if (payload.id !== undefined && requestedId === null) {
              reply(400, { error: 'invalid task id' })
              return
            }
            const found = findTeamLead(webCtx)
            if (!found) {
              reply(409, { error: 'no live Team lead' })
              return
            }
            let rows = []
            try {
              rows = found.teams.listTasks(found.lead)
            } catch (error) {
              reply(500, { error: 'cannot read team tasks' })
              return
            }
            const targets = []
            for (let i = 0; i < rows.length; i += 1) {
              const task = rows[i]
              if (!task || task.status !== 'completed') continue
              if (requestedId !== null && String(task.id) !== requestedId) continue
              targets.push(task)
            }
            if (requestedId !== null && targets.length === 0) {
              reply(404, { error: 'archived task not found' })
              return
            }
            if (
              requestedId !== null
              && expectedRevision !== null
              && typeof targets[0].revision === 'number'
              && targets[0].revision !== expectedRevision
            ) {
              reply(409, { error: 'task revision changed' })
              return
            }
            let deleted = 0
            const failures = []
            for (let i = 0; i < targets.length; i += 1) {
              const task = targets[i]
              try {
                await found.teams.updateTask(found.lead, {
                  taskId: task.id,
                  expectedRevision: task.revision,
                  action: 'delete',
                })
                deleted += 1
              } catch (error) {
                failures.push({
                  id: String(task.id),
                  message: error && error.message ? String(error.message).slice(0, 120) : 'delete failed',
                })
              }
            }
            reply(200, { deleted: deleted, deletedId: requestedId, failed: failures.length, errors: failures.slice(0, 5) })
          } finally {
            archiveDeleting = false
          }
        } catch (error) {
          reply(500, { error: error && error.message ? String(error.message).slice(0, 160) : 'internal error' })
        }
      },
    }))

    // 推送流：面板用 EventSource 订阅，Host 每 500ms 推一份快照，客户端无需轮询。
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: STREAM_ROUTE,
      handler(req, res) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })
        res.write('retry: 1000\n\n')
        let closed = false
        const send = () => {
          if (closed) return
          let payload
          try {
            payload = JSON.stringify(collectLive(webCtx))
          } catch (error) {
            payload = JSON.stringify({ error: error && error.message ? error.message : String(error) })
          }
          try {
            res.write('data: ' + payload + '\n\n')
          } catch (error) {
            stop()
          }
        }
        const timer = setInterval(send, STREAM_INTERVAL_MS)
        const stop = () => {
          if (closed) return
          closed = true
          clearInterval(timer)
          try {
            res.end()
          } catch (error) {
            /* already closed */
          }
        }
        send()
        req.on('close', stop)
        req.on('error', stop)
        res.on('close', stop)
      },
    }))
  })
}
