window.__ModuleLoader__.load({
  id: 'dsh-workbench-templates',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'workbenchTemplates'
    const ROUTE = '/workbench-templates/v3.md'
    const LIVE_ROUTE = '/workbench-templates/live'
    const STREAM_ROUTE = '/workbench-templates/stream'
    const ARCHIVE_ROUTE = '/workbench-templates/archive/delete'
    const POLL_MS = 1000
    const LOAD_TIMEOUT_MS = 10000
    const MONO =
      "'Sarasa Mono SC','NSimSun','新宋体',ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono','Microsoft YaHei',monospace"

    const DICTS = {
      zh: {
        title: '多智能体工作台',
        subtitle: '模板集 v3 · 规模化 × 省 Token × 长效记忆',
        overviewTitle: '文档信息',
        barsTitle: 'GA 实测收益（v3 借鉴依据）',
        metaLabels: {
          '升级时间': '升级时间',
          '基础': '基础',
          '支持规模': '支持规模',
        },
        bars: [
          { label: '跨任务重复执行 token 平均下降', text: '79.3%', value: 79.3 },
          { label: '同类任务最高下降', text: '92.4%', value: 92.4 },
          { label: '同等任务 token 消耗占比', text: '15%-35%', value: 35 },
        ],
        shortNames: ['摘要', '规模化', 'Token 经济学', '长效记忆', '提示词增量', '验收清单'],
        loading: '正在读取模板集全文…',
        timeout: '读取超过 10 秒仍未返回，可重试。',
        errorTitle: '读取失败',
        retry: '重试',
        refresh: '重新读取',
        copy: '复制全文',
        copied: '已复制',
        chars: '字符',
        lines: '行',
        sections: '节',
        outline: '快速导航',
        version: 'V3 · 2026-11-03',
        viewOverview: '总览',
        viewDoc: '全文',
        rail: [
          { id: 'overview', label: '总览' },
          { id: 'team', label: '指挥树' },
          { id: 'token', label: 'Token' },
          { id: 'memory', label: '记忆' },
          { id: 'check', label: '验收' },
          { id: 'doc', label: '全文' },
        ],
        kpis: [
          { value: '29', unit: '', label: '理论 Agent 上限', hint: '4 分片 × 6 成员 + SubLead', ratio: 0.86, color: '#3fd0ff' },
          { value: '15-35', unit: '%', label: '同类任务 token 占比', hint: 'GA 实测区间', ratio: 0.35, color: '#2ce6c0' },
          { value: '≤3000', unit: '', label: '单任务 token 预算', hint: '任务描述上限', ratio: 0.62, color: '#ffc247' },
          { value: '5', unit: '层', label: 'L0–L4 分层记忆', hint: '默认只注入 L0 + L1', ratio: 0.5, color: '#8b8cff' },
        ],
        cards: {
          team: '指挥树 · 规模守则',
          token: 'Token 效率',
          check: '验收待办',
          mech: 'GA 四机制',
          memory: '分层记忆',
          route: '模型分层路由',
        },
        tree: {
          lead: 'Lead',
          leadNote: '强模型',
          sub: 'SubLead',
          subNote: '中模型',
          worker: '成员 ×6',
          workerNote: '经济模型',
        },
        teamTiles: [
          { label: 'Lead 子节点', value: '≤4' },
          { label: '分片成员', value: '≤6' },
          { label: '跨 Agent 长消息', value: '0' },
          { label: '工件通信', value: '磁盘' },
        ],
        tokenMain: { value: '79.3', unit: '%', label: '跨任务平均下降', hint: 'GA 长期进化：第九轮仅 2.3 万 token' },
        tokenStats: [
          { label: '5 次重复', value: '102s→66s' },
          { label: '最高降幅', value: '92.4%' },
          { label: '同类占比', value: '15-35%' },
        ],
        checkTotal: 18,
        checkCaption: '验收待勾选',
        checkGroups: [
          { label: '规模化验收', count: 5 },
          { label: 'Token 验收', count: 4 },
          { label: '记忆验收', count: 5 },
          { label: '可靠验收', count: 4 },
        ],
        mechTiles: [
          { glyph: '◆', label: '信息密度', value: '≤3000', hint: 'token / 任务' },
          { glyph: '▣', label: '最小原子工具', value: '9', hint: '五类能力' },
          { glyph: '↻', label: 'SOP 自进化', value: '−60%', hint: '复用后 token' },
          { glyph: '⊟', label: '上下文压缩门', value: '4', hint: '级裁剪' },
        ],
        memoryLayers: [
          { code: 'L0', name: '元记忆', store: 'MEMORY-INDEX.md 头部', inject: '每次注入', ratio: 1 },
          { code: 'L1', name: '索引', store: 'MEMORY-INDEX.md', inject: '默认注入', ratio: 1 },
          { code: 'L2', name: '事实', store: 'facts\\*.md', inject: '按需读取', ratio: 0.55 },
          { code: 'L3', name: '程序', store: 'sop\\*.md / tools\\', inject: '按需读取', ratio: 0.55 },
          { code: 'L4', name: '轨迹', store: 'traces\\<日期>\\', inject: '不注入', ratio: 0.12 },
        ],
        routeRows: [
          { role: 'Lead', model: '强模型', note: '规划 / 分片 / 裁决', ratio: 0.92 },
          { role: 'SubLead', model: '中模型', note: '分片管理 · 形式初审', ratio: 0.58 },
          { role: '执行成员', model: '经济模型', note: '确定性步骤执行', ratio: 0.3 },
        ],
        routeHint: '默认分层可省 50%-70% 成本',
        liveTitle: '实时运行',
        liveBadge: 'PUSH · 0.5s',
        liveConnecting: '连接中',
        liveOnline: '在线',
        liveOffline: '断开',
        liveInactive: '未激活',
        liveUnavailable: '实时通道未激活：本插件的 Host 半在重启后生效。重启应用即可接入实时数据。',
        liveAgents: '活跃 Agent',
        liveMemory: '内存占用',
        liveSessions: '会话',
        liveTeamRunning: '团队运行',
        liveJobs: '后台任务',
        liveUptime: '运行时长',
        liveRoots: '根',
        liveChildren: '子',
        liveTrend: '实时趋势',
        liveUpd: '推送间隔 0.5s',
        liveEvents: '事件流',
        liveNoEvents: '等待变动…',
        liveOfflineHint: '实时数据源不可达，展示最后一次采样。',
        liveConnectingHint: '等待 Host 推送第一份实时快照…',
        baselineLabel: '模板基线 · 文档指标',
        liveBadgeShort: 'LIVE',
        baselineBadge: '基线',
        kpiAgents: '活跃 Agent',
        kpiSessions: '会话',
        kpiTokens: '上下文 Token',
        kpiMemory: '内存占用',
        kpiCap: '文档上限 29',
        kpiSessionsHint: '无活动会话',
        kpiTokensHint: '无活动会话',
        kpiMemoryHint: 'Host 进程内存',
        kpiPeak: '峰值',
        kpiTotal: '总量',
        kpiModelLabel: '模型',
        tokenDialLabel: '上下文占用',
        tokenHint: '文档基线：同类任务 token 占 15-35%（GA）',
        liveTrendTitle: '实时趋势 & 事件流',
        liveSync: '同步',
        liveMembers: '团队成员',
        routeHintLive: '来自实时 Team 成员模型',
        taskEmpty: '暂无 Team 任务',
        taskHint: '文档基线：验收清单共 18 项（规模化 5 / Token 4 / 记忆 5 / 可靠 4）',
        taskPending: '待办',
        taskInProgress: '进行中',
        taskCompleted: '已完成',
        taskReady: '就绪',
        taskCleared: '任务已全部清零',
        taskArchived: '已完成归档',
        taskNone: '暂无 Team 任务',
        taskAutoNote: '完成的任务自动从看板清零（记录保留在 Team 日志）',
        taskDeleteArchive: '删除归档',
        taskDeleteConfirm: '确认永久删除归档',
        taskDeleteYes: '确认删除',
        taskCancel: '取消',
        taskDeleteDone: '已删除归档',
        taskDeleteFailed: '删除失败',
        taskArchiveCount: '已完成归档',
        taskViewArchive: '查看归档',
        taskHideArchive: '收起归档',
        taskDeleteOne: '删除',
        taskConfirmOne: '确认',
        taskArchiveEmpty: '暂无归档任务',
        taskArchiveUnavailable: '归档列表不可用（Host 版本较旧），仍可删除全部归档',
        ghostSlot: '待派',
        ghostHint: '空位',
        memberTasks: '任务',
        taskSessionLabel: '实时会话 · Token',
        teamFallbackNote: '未检测到 Team，显示模板基线',
        cardTeamLive: '指挥树 · 实时成员',
        cardTokenLive: '上下文占用',
        cardTasksLive: '团队任务板',
        cardMechLive: '运行时指标',
        cardSessionsLive: '会话上下文',
        mechTools: '工具注册',
        mechToolsHint: '已注册工具数',
        mechNodes: '上下文节点',
        mechNodesHint: '峰值会话节点',
        mechEvents: '会话事件',
        mechEventsHint: '累计事件条数',
        mechSessions: '可测会话',
        mechSessionsHint: '完成 Token 测量',
        sessEmpty: '无活动会话',
        sessHint: '会话 · 上下文 Token · 事件数',
        statusLabels: {
          running: '运行中',
          inactive: '空闲',
          provisioning: '启动中',
          failed: '失败',
        },
        empty: '文档没有可显示的内容。',
        boundaryTitle: '面板渲染异常',
        boundaryHint: '可关闭后重开该面板重试；模板内容仍可用 workbench_templates 工具读取。',
      },
      en: {
        title: 'Multi-Agent Workbench',
        subtitle: 'Template set v3 · scale × token economy × long-term memory',
        overviewTitle: 'Document',
        barsTitle: 'Measured GA gains (v3 rationale)',
        metaLabels: {
          '升级时间': 'Updated',
          '基础': 'Built on',
          '支持规模': 'Team size',
        },
        bars: [
          { label: 'Average token drop across repeated tasks', text: '79.3%', value: 79.3 },
          { label: 'Peak drop on a comparable task', text: '92.4%', value: 92.4 },
          { label: 'Token use vs comparable agents', text: '15%-35%', value: 35 },
        ],
        shortNames: ['Summary', 'Scaling', 'Token economy', 'Memory', 'Prompts', 'Checklist'],
        loading: 'Reading the template set…',
        timeout: 'Still loading after 10 seconds. You can retry.',
        errorTitle: 'Failed to load',
        retry: 'Retry',
        refresh: 'Reload',
        copy: 'Copy all',
        copied: 'Copied',
        chars: 'chars',
        lines: 'lines',
        sections: 'sections',
        outline: 'Jump to',
        version: 'V3 · 2026-11-03',
        viewOverview: 'Dashboard',
        viewDoc: 'Full text',
        rail: [
          { id: 'overview', label: 'Overview' },
          { id: 'team', label: 'Team' },
          { id: 'token', label: 'Token' },
          { id: 'memory', label: 'Memory' },
          { id: 'check', label: 'Checklist' },
          { id: 'doc', label: 'Text' },
        ],
        kpis: [
          { value: '29', unit: '', label: 'Theoretical agent cap', hint: '4 squads × 6 workers + SubLeads', ratio: 0.86, color: '#3fd0ff' },
          { value: '15-35', unit: '%', label: 'Token use vs peers', hint: 'GA measured range', ratio: 0.35, color: '#2ce6c0' },
          { value: '≤3000', unit: '', label: 'Task token budget', hint: 'per task description', ratio: 0.62, color: '#ffc247' },
          { value: '5', unit: 'tiers', label: 'L0–L4 tiered memory', hint: 'only L0 + L1 injected', ratio: 0.5, color: '#8b8cff' },
        ],
        cards: {
          team: 'Command tree · scale rules',
          token: 'Token efficiency',
          check: 'Acceptance backlog',
          mech: 'GA four mechanisms',
          memory: 'Tiered memory',
          route: 'Model routing',
        },
        tree: {
          lead: 'Lead',
          leadNote: 'strong model',
          sub: 'SubLead',
          subNote: 'mid model',
          worker: 'workers ×6',
          workerNote: 'economy model',
        },
        teamTiles: [
          { label: 'Lead children', value: '≤4' },
          { label: 'Squad members', value: '≤6' },
          { label: 'Cross-agent messages', value: '0' },
          { label: 'Artifact channel', value: 'disk' },
        ],
        tokenMain: { value: '79.3', unit: '%', label: 'average drop', hint: 'GA long-run: 23K tokens by round 9' },
        tokenStats: [
          { label: '5 repeats', value: '102s→66s' },
          { label: 'Peak drop', value: '92.4%' },
          { label: 'Peer share', value: '15-35%' },
        ],
        checkTotal: 18,
        checkCaption: 'acceptance items to confirm',
        checkGroups: [
          { label: 'Scale', count: 5 },
          { label: 'Token', count: 4 },
          { label: 'Memory', count: 5 },
          { label: 'Reliability', count: 4 },
        ],
        mechTiles: [
          { glyph: '◆', label: 'Information density', value: '≤3000', hint: 'tokens / task' },
          { glyph: '▣', label: 'Minimal tools', value: '9', hint: 'five categories' },
          { glyph: '↻', label: 'SOP evolution', value: '−60%', hint: 'tokens on reuse' },
          { glyph: '⊟', label: 'Compression gate', value: '4', hint: 'levels' },
        ],
        memoryLayers: [
          { code: 'L0', name: 'Meta', store: 'MEMORY-INDEX.md header', inject: 'always', ratio: 1 },
          { code: 'L1', name: 'Index', store: 'MEMORY-INDEX.md', inject: 'default', ratio: 1 },
          { code: 'L2', name: 'Facts', store: 'facts\\*.md', inject: 'on demand', ratio: 0.55 },
          { code: 'L3', name: 'Procedures', store: 'sop\\*.md / tools\\', inject: 'on demand', ratio: 0.55 },
          { code: 'L4', name: 'Traces', store: 'traces\\<date>\\', inject: 'never', ratio: 0.12 },
        ],
        routeRows: [
          { role: 'Lead', model: 'strong', note: 'plan / split / judge', ratio: 0.92 },
          { role: 'SubLead', model: 'mid', note: 'squad management', ratio: 0.58 },
          { role: 'Workers', model: 'economy', note: 'deterministic steps', ratio: 0.3 },
        ],
        routeHint: 'Tiering saves 50%-70% by default',
        liveTitle: 'Live runtime',
        liveBadge: 'PUSH · 0.5s',
        liveConnecting: 'connecting',
        liveOnline: 'online',
        liveOffline: 'offline',
        liveInactive: 'inactive',
        liveUnavailable: 'Live channel inactive: this plugin\'s Host half activates after a restart. Restart the app to enable live data.',
        liveAgents: 'live agents',
        liveMemory: 'memory',
        liveSessions: 'sessions',
        liveTeamRunning: 'team running',
        liveJobs: 'jobs',
        liveUptime: 'uptime',
        liveRoots: 'roots',
        liveChildren: 'children',
        liveTrend: 'live trend',
        liveUpd: 'pushed every 0.5s',
        liveEvents: 'events',
        liveNoEvents: 'waiting for changes…',
        liveOfflineHint: 'Live feed unreachable; showing the last sample.',
        liveConnectingHint: 'Waiting for the first Host snapshot…',
        baselineLabel: 'Template baseline · document metrics',
        liveBadgeShort: 'LIVE',
        baselineBadge: 'baseline',
        kpiAgents: 'live agents',
        kpiSessions: 'sessions',
        kpiTokens: 'context tokens',
        kpiMemory: 'memory',
        kpiCap: 'document cap 29',
        kpiSessionsHint: 'no live sessions',
        kpiTokensHint: 'no live sessions',
        kpiMemoryHint: 'Host process memory',
        kpiPeak: 'peak',
        kpiTotal: 'total',
        kpiModelLabel: 'model',
        tokenDialLabel: 'context usage',
        tokenHint: 'Document baseline: 15-35% of comparable agents (GA)',
        liveTrendTitle: 'Live trend & events',
        liveSync: 'sync',
        liveMembers: 'team members',
        routeHintLive: 'From live Team member models',
        taskEmpty: 'No Team tasks yet',
        taskHint: 'Document baseline: 18 acceptance items (scale 5 / token 4 / memory 5 / reliability 4)',
        taskPending: 'pending',
        taskInProgress: 'in progress',
        taskCompleted: 'completed',
        taskReady: 'ready',
        taskCleared: 'All tasks cleared',
        taskArchived: 'completed & archived',
        taskNone: 'No Team tasks',
        taskAutoNote: 'Completed tasks auto-clear from this board (records stay in the Team log)',
        taskDeleteArchive: 'Delete archive',
        taskDeleteConfirm: 'Permanently delete archived tasks',
        taskDeleteYes: 'Delete',
        taskCancel: 'Cancel',
        taskDeleteDone: 'archived tasks deleted',
        taskDeleteFailed: 'Delete failed',
        taskArchiveCount: 'archived',
        taskViewArchive: 'View archive',
        taskHideArchive: 'Hide archive',
        taskDeleteOne: 'Delete',
        taskConfirmOne: 'Confirm',
        taskArchiveEmpty: 'No archived tasks',
        taskArchiveUnavailable: 'Archive list unavailable (older Host); delete-all still works',
        ghostSlot: 'empty slot',
        ghostHint: 'unassigned',
        memberTasks: 'tasks',
        taskSessionLabel: 'Live sessions · tokens',
        teamFallbackNote: 'No Team detected; showing the template baseline',
        cardTeamLive: 'Command tree · live members',
        cardTokenLive: 'Context usage',
        cardTasksLive: 'Team task board',
        cardMechLive: 'Runtime metrics',
        cardSessionsLive: 'Session contexts',
        mechTools: 'registered tools',
        mechToolsHint: 'live tool count',
        mechNodes: 'context nodes',
        mechNodesHint: 'peak session nodes',
        mechEvents: 'session events',
        mechEventsHint: 'accumulated events',
        mechSessions: 'measured sessions',
        mechSessionsHint: 'token measurement done',
        sessEmpty: 'No live sessions',
        sessHint: 'session · context tokens · events',
        statusLabels: {
          running: 'running',
          inactive: 'idle',
          provisioning: 'provisioning',
          failed: 'failed',
        },
        empty: 'The document has no displayable content.',
        boundaryTitle: 'Panel failed to render',
        boundaryHint: 'Close and reopen the panel to retry; the content stays available through the workbench_templates tool.',
      },
    }

    const CSS = [
      '.wb-panel{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;gap:12px;padding:16px 20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);}',
      '.wb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex:0 0 auto;}',
      '.wb-title{margin:0;font-size:16px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary);}',
      '.wb-subtitle{margin:2px 0 0;font-size:12.5px;color:var(--dsw-alias-label-secondary);}',
      '.wb-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto;}',
      '.wb-meta{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.wb-button{font:inherit;font-size:12.5px;padding:4px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;}',
      '.wb-button:hover{border-color:var(--dsw-alias-border-l2);}',
      '.wb-button:disabled{cursor:default;opacity:.6;}',
      '.wb-button.is-done{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}',
      '.wb-overview{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);flex:0 0 auto;}',
      '.wb-overview-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}',
      '.wb-overview-title{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.wb-overview-sub{font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.wb-meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;}',
      '.wb-meta-item{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);}',
      '.wb-meta-k{font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.wb-meta-v{font-size:12.5px;line-height:1.65;color:var(--dsw-alias-label-primary);}',
      '.wb-bars{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 18px;padding-top:2px;}',
      '.wb-bars-title{grid-column:1/-1;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
      '.wb-bar{display:flex;flex-direction:column;gap:4px;}',
      '.wb-bar-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.wb-bar-v{font-weight:700;color:var(--dsw-alias-label-primary);white-space:nowrap;}',
      '.wb-bar-track{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;}',
      '.wb-bar-fill{height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary);opacity:.85;}',
      '.wb-nav{display:flex;flex-wrap:wrap;gap:6px;flex:0 0 auto;max-height:76px;overflow:auto;}',
      '.wb-nav-label{font-size:11px;color:var(--dsw-alias-label-secondary);align-self:center;margin-right:2px;}',
      '.wb-nav-chip{font:inherit;font-size:12px;padding:2px 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;}',
      '.wb-nav-chip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);}',
      '.wb-doc{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:14px;padding-right:4px;}',
      '.wb-sec{display:flex;flex-direction:column;gap:12px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);}',
      '.wb-sec-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding-bottom:9px;border-bottom:1px solid var(--dsw-alias-border-l1);}',
      '.wb-sec-code{font-family:' + MONO + ';font-size:11px;font-weight:700;padding:1px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);white-space:nowrap;}',
      '.wb-sec-title{margin:0;font-size:15px;font-weight:650;line-height:1.45;color:var(--dsw-alias-label-primary);}',
      '.wb-sub{display:flex;flex-direction:column;gap:8px;}',
      '.wb-sub-title{display:flex;align-items:center;gap:8px;margin:4px 0 0;font-size:13.5px;font-weight:650;line-height:1.5;color:var(--dsw-alias-label-primary);}',
      '.wb-sub-title::before{content:"";flex:0 0 auto;width:3px;height:14px;border-radius:2px;background:var(--dsw-alias-brand-primary);}',
      '.wb-p{margin:0;font-size:13.5px;line-height:1.8;color:var(--dsw-alias-label-primary);}',
      '.wb-label{display:flex;align-items:center;gap:8px;margin:6px 0 0;font-size:12px;font-weight:650;letter-spacing:.02em;color:var(--dsw-alias-label-secondary);}',
      '.wb-label::before{content:"";flex:0 0 auto;width:4px;height:4px;border-radius:50%;background:var(--dsw-alias-brand-primary);}',
      '.wb-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px;font-size:13.5px;line-height:1.75;color:var(--dsw-alias-label-primary);}',
      '.wb-list li::marker{color:var(--dsw-alias-brand-primary);}',
      '.wb-check{display:flex;flex-direction:column;gap:6px;}',
      '.wb-check-row{display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-primary);}',
      '.wb-check-box{flex:0 0 auto;margin-top:2px;width:13px;height:13px;border-radius:4px;border:1.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);}',
      '.wb-code{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);overflow:auto;}',
      '.wb-code pre{margin:0;padding:12px 14px;font-family:' + MONO + ';font-size:12px;line-height:1.62;white-space:pre;color:var(--dsw-alias-label-primary);}',
      '.wb-quote{margin:0;padding:9px 12px;border-left:3px solid var(--dsw-alias-brand-primary);border-radius:0 8px 8px 0;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.75;}',
      '.wb-table-wrap{overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base);}',
      '.wb-table{border-collapse:collapse;width:100%;font-size:12.5px;}',
      '.wb-table th{position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600;text-align:left;padding:7px 11px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap;}',
      '.wb-table td{padding:7px 11px;border-bottom:1px solid var(--dsw-alias-border-l1);vertical-align:top;line-height:1.65;color:var(--dsw-alias-label-primary);}',
      '.wb-table tbody tr:nth-child(even){background:var(--dsw-alias-bg-layer-1);}',
      '.wb-table tbody tr:last-child td{border-bottom:none;}',
      '.wb-table .wb-td-key{font-weight:600;white-space:nowrap;}',
      '.wb-ok{color:var(--dsw-alias-state-success-primary);font-weight:700;}',
      '.wb-no{color:var(--dsw-alias-state-error-primary);font-weight:700;}',
      '.wb-notice{flex:1 1 auto;display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:20px;border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:13px;}',
      '.wb-error{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);}',
      '.wb-hint{margin:0;font-size:12px;color:var(--dsw-alias-state-warn-primary);}',
      '.wb-detail{margin:0;font-size:12px;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary);}',
      '.hud-root{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;position:relative;box-sizing:border-box;background:radial-gradient(120% 90% at 50% -10%,rgba(26,110,190,.30),transparent 62%),radial-gradient(rgba(120,220,255,.10) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(160deg,#03101f 0%,#06182c 46%,#020c18 100%);color:#cfe9ff;}',
      '.hud-root *{box-sizing:border-box;}',
      '.hud-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex:0 0 auto;padding:11px 16px 10px;border-bottom:1px solid rgba(63,180,255,.22);background:linear-gradient(180deg,rgba(9,36,64,.9),rgba(9,36,64,0));z-index:2;}',
      '.hud-brand{display:flex;align-items:center;gap:12px;min-width:0;}',
      '.hud-logo{width:26px;height:26px;flex:0 0 auto;border:1px solid rgba(79,214,255,.75);transform:rotate(45deg);box-shadow:inset 0 0 12px rgba(79,214,255,.45),0 0 10px rgba(79,214,255,.35);position:relative;}',
      '.hud-logo::after{content:"";position:absolute;inset:5px;border:1px solid rgba(44,230,192,.8);}',
      '.hud-title{margin:0;font-size:16.5px;font-weight:600;letter-spacing:.16em;color:#eaf9ff;text-shadow:0 0 14px rgba(63,208,255,.55);white-space:nowrap;}',
      '.hud-subtitle{margin:2px 0 0;font-size:10.5px;letter-spacing:.1em;color:#6f9cc4;white-space:nowrap;}',
      '.hud-topright{display:flex;align-items:center;gap:8px;flex:0 0 auto;}',
      '.hud-clock{font-family:' + MONO + ';font-size:10.5px;letter-spacing:.08em;color:#7fb6dd;white-space:nowrap;}',
      '.hud-btn{font:inherit;font-size:11px;letter-spacing:.06em;padding:3px 10px;border-radius:2px;border:1px solid rgba(63,180,255,.4);background:rgba(10,42,72,.7);color:#bfe8ff;cursor:pointer;white-space:nowrap;}',
      '.hud-btn:hover{border-color:rgba(79,214,255,.8);color:#eaf9ff;box-shadow:0 0 12px rgba(63,208,255,.25);}',
      '.hud-btn:disabled{opacity:.5;cursor:default;}',
      '.hud-btn.done{border-color:rgba(44,230,192,.8);color:#2ce6c0;}',
      '.hud-switch{display:flex;border:1px solid rgba(63,180,255,.35);border-radius:2px;overflow:hidden;}',
      '.hud-switch button{font:inherit;font-size:10.5px;letter-spacing:.08em;padding:3px 10px;border:0;background:transparent;color:#7fb6dd;cursor:pointer;}',
      '.hud-switch button.on{background:rgba(63,208,255,.18);color:#eaf9ff;box-shadow:inset 0 0 10px rgba(63,208,255,.25);}',
      '.hud-body{flex:1 1 auto;min-height:0;display:flex;position:relative;z-index:1;}',
      '.hud-rail{flex:0 0 58px;display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 0;border-right:1px solid rgba(63,180,255,.18);background:rgba(4,18,34,.6);overflow:auto;}',
      '.hud-rail-btn{width:42px;min-height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:5px 0;border:1px solid transparent;border-radius:3px;background:transparent;color:#6f9cc4;cursor:pointer;font:inherit;}',
      '.hud-rail-btn span{font-size:9px;letter-spacing:.04em;line-height:1;}',
      '.hud-rail-btn:hover{color:#bfe8ff;background:rgba(63,208,255,.08);}',
      '.hud-rail-btn.on{color:#eaf9ff;border-color:rgba(79,214,255,.55);background:rgba(63,208,255,.14);box-shadow:0 0 14px rgba(63,208,255,.28);}',
      '.hud-rail-btn svg{display:block;}',
      '.hud-main{flex:1 1 auto;min-height:0;overflow:auto;padding:14px 16px 24px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:rgba(63,180,255,.4) transparent;}',
      '.hud-main::-webkit-scrollbar{width:8px;height:8px;}',
      '.hud-main::-webkit-scrollbar-thumb{background:rgba(63,180,255,.35);border-radius:4px;}',
      '.hud-main::-webkit-scrollbar-track{background:rgba(255,255,255,.03);}',
      '.hud-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}',
      '.hud-row{display:grid;grid-template-columns:minmax(300px,1.15fr) minmax(290px,1fr) minmax(250px,.8fr);gap:12px;}',
      '.hud-card{position:relative;border:1px solid rgba(63,180,255,.3);border-radius:2px;background:linear-gradient(180deg,rgba(9,34,60,.92),rgba(5,20,38,.94));box-shadow:inset 0 0 28px rgba(30,140,255,.10),0 0 16px rgba(20,90,160,.14);padding:11px 13px 13px;min-width:0;}',
      '.hud-card::before,.hud-card::after{content:"";position:absolute;width:10px;height:10px;border-style:solid;border-color:#4fd6ff;filter:drop-shadow(0 0 4px rgba(79,214,255,.7));pointer-events:none;}',
      '.hud-card::before{top:-1px;left:-1px;border-width:1px 0 0 1px;}',
      '.hud-card::after{bottom:-1px;right:-1px;border-width:0 1px 1px 0;}',
      '.hud-cardhead{display:flex;align-items:center;gap:8px;margin-bottom:9px;min-width:0;}',
      '.hud-carddot{width:6px;height:6px;flex:0 0 auto;background:#4fd6ff;transform:rotate(45deg);box-shadow:0 0 8px #4fd6ff;}',
      '.hud-cardtitle{font-size:11px;font-weight:600;letter-spacing:.12em;color:#a8d8f5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.hud-cardbadge{margin-left:auto;flex:0 0 auto;font-family:' + MONO + ';font-size:10px;color:#ffc247;border:1px solid rgba(255,194,71,.45);border-radius:2px;padding:0 6px;background:rgba(255,194,71,.08);}',
      '.hud-tone-alert{border-color:rgba(255,93,103,.5);box-shadow:inset 0 0 28px rgba(255,80,90,.10),0 0 18px rgba(255,80,90,.12);}',
      '.hud-tone-alert .hud-carddot{background:#ff5d67;box-shadow:0 0 8px #ff5d67;}',
      '.hud-tone-alert .hud-cardtitle{color:#ffc9cd;}',
      '.hud-gauge{position:relative;display:flex;flex-direction:column;align-items:center;}',
      '.hud-gauge svg{display:block;width:100%;max-width:180px;height:auto;}',
      '.hud-gaugeread{position:absolute;left:0;right:0;bottom:6px;text-align:center;pointer-events:none;}',
      '.hud-gaugenum{font-family:' + MONO + ';font-size:21px;font-weight:700;letter-spacing:.02em;color:#f2fbff;text-shadow:0 0 12px rgba(63,208,255,.75);line-height:1;}',
      '.hud-gaugeunit{font-size:11px;color:#7fd3ff;margin-left:1px;}',
      '.hud-gaugehint{margin-top:6px;font-size:9.5px;color:#5f8fb5;text-align:center;line-height:1.4;}',
      '.hud-dial{position:relative;display:flex;flex-direction:column;align-items:center;}',
      '.hud-dial svg{display:block;width:100%;max-width:250px;height:auto;}',
      '.hud-dialread{position:absolute;top:50%;left:0;right:0;transform:translateY(-56%);text-align:center;pointer-events:none;}',
      '.hud-dialnum{font-family:' + MONO + ';font-size:30px;font-weight:700;color:#f2fbff;text-shadow:0 0 16px rgba(63,208,255,.8);line-height:1;}',
      '.hud-dialunit{font-size:13px;color:#7fd3ff;}',
      '.hud-diallabel{margin-top:5px;font-size:9.5px;letter-spacing:.12em;color:#8fc9ec;text-transform:uppercase;}',
      '.hud-statrow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px;}',
      '.hud-stat{border:1px solid rgba(63,180,255,.22);background:rgba(10,40,70,.45);padding:5px 7px;border-radius:2px;text-align:center;min-width:0;}',
      '.hud-statv{font-family:' + MONO + ';font-size:11.5px;color:#eaf9ff;white-space:nowrap;}',
      '.hud-statl{margin-top:1px;font-size:9px;color:#6f9cc4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-tree{display:flex;flex-direction:column;align-items:center;padding:2px 0 4px;}',
      '.hud-node{border:1px solid rgba(63,208,255,.5);background:rgba(12,48,82,.72);border-radius:2px;padding:3px 10px;font-family:' + MONO + ';font-size:10.5px;letter-spacing:.06em;color:#d8f2ff;box-shadow:0 0 10px rgba(63,208,255,.16);white-space:nowrap;}',
      '.hud-node em{font-style:normal;color:#6f9cc4;font-size:9px;margin-left:6px;}',
      '.hud-nodelead{border-color:#2ce6c0;box-shadow:0 0 14px rgba(44,230,192,.3);}',
      '.hud-nodeworker{border-color:rgba(139,140,255,.6);box-shadow:0 0 12px rgba(139,140,255,.22);}',
      '.hud-links{position:relative;width:62%;height:24px;flex:0 0 auto;}',
      '.hud-stem{position:absolute;left:50%;top:0;width:1px;height:11px;background:rgba(79,214,255,.55);}',
      '.hud-bus{position:absolute;left:0;right:0;top:11px;height:1px;background:rgba(79,214,255,.42);}',
      '.hud-drop{position:absolute;top:11px;width:1px;height:11px;background:rgba(79,214,255,.42);}',
      '.hud-treerow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:100%;justify-items:center;}',
      '.hud-kv{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;}',
      '.hud-kvitem{display:flex;align-items:baseline;justify-content:space-between;gap:6px;border:1px solid rgba(63,180,255,.2);background:rgba(10,40,70,.4);padding:4px 8px;border-radius:2px;min-width:0;}',
      '.hud-kvl{font-size:9.5px;color:#6f9cc4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.hud-kvv{font-family:' + MONO + ';font-size:11.5px;color:#d8f2ff;white-space:nowrap;}',
      '.hud-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
      '.hud-tile{position:relative;border:1px solid rgba(63,180,255,.22);background:rgba(10,40,70,.5);border-radius:2px;padding:7px 9px;}',
      '.hud-tile::before,.hud-tile::after{content:"";position:absolute;width:6px;height:6px;border-style:solid;border-color:rgba(79,214,255,.75);}',
      '.hud-tile::before{top:-1px;left:-1px;border-width:1px 0 0 1px;}',
      '.hud-tile::after{bottom:-1px;right:-1px;border-width:0 1px 1px 0;}',
      '.hud-tilehead{display:flex;align-items:center;gap:6px;font-size:9.5px;color:#7fb6dd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-tilevalue{margin-top:2px;font-family:' + MONO + ';font-size:16px;color:#eaf9ff;letter-spacing:.02em;}',
      '.hud-tilehint{margin-top:1px;font-size:9px;color:#5f8fb5;}',
      '.hud-memrow{display:grid;grid-template-columns:34px minmax(0,1fr) 92px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px dashed rgba(63,180,255,.13);}',
      '.hud-memrow:last-child{border-bottom:none;}',
      '.hud-memcode{font-family:' + MONO + ';font-size:9.5px;font-weight:700;color:#04202f;background:linear-gradient(90deg,#2ce6c0,#3fd0ff);border-radius:2px;text-align:center;padding:1px 0;}',
      '.hud-memname{font-size:11px;color:#cfe9ff;}',
      '.hud-memstore{font-family:' + MONO + ';font-size:9px;color:#6f9cc4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-membar{height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;}',
      '.hud-memfill{height:100%;border-radius:3px;background:linear-gradient(90deg,#2ce6c0,#3fd0ff);}',
      '.hud-meminject{margin-top:2px;font-size:8.5px;color:#6f9cc4;text-align:right;}',
      '.hud-alertnum{font-family:' + MONO + ';font-size:30px;font-weight:700;color:#ff8a92;text-shadow:0 0 16px rgba(255,93,103,.6);line-height:1;text-align:center;}',
      '.hud-alertcap{margin:2px 0 9px;text-align:center;font-size:9px;letter-spacing:.1em;color:#ff9aa2;}',
      '.hud-alertitem{display:grid;grid-template-columns:70px 1fr 26px;gap:8px;align-items:center;font-size:10px;color:#ffd5d8;padding:3px 0;}',
      '.hud-alertbar{height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;}',
      '.hud-alertfill{height:100%;background:linear-gradient(90deg,#ff5d67,#ffc247);}',
      '.hud-alertcount{font-family:' + MONO + ';font-size:10px;color:#ffb3b8;text-align:right;}',
      '.hud-route{display:flex;flex-direction:column;gap:8px;}',
      '.hud-routerow{display:grid;grid-template-columns:64px 58px minmax(0,1fr);gap:8px;align-items:center;font-size:10px;color:#cfe9ff;}',
      '.hud-routemodel{font-family:' + MONO + ';font-size:9px;border:1px solid rgba(63,180,255,.35);border-radius:2px;text-align:center;color:#8fe3ff;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-routebar{height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;}',
      '.hud-routefill{height:100%;background:linear-gradient(90deg,#3fd0ff,#8b8cff);}',
      '.hud-hint{margin-top:8px;font-size:9px;color:#5f8fb5;}',
      '.hud-docview{display:flex;flex-direction:column;gap:10px;}',
      '.hud-docview .wb-nav{position:sticky;top:-2px;z-index:2;padding:6px 0 8px;background:linear-gradient(180deg,rgba(3,16,31,.97),rgba(3,16,31,.8) 70%,rgba(3,16,31,0));}',
      '.hud-docview .wb-nav-chip{border-color:rgba(63,180,255,.3);color:#7fb6dd;}',
      '.hud-docview .wb-nav-chip:hover{color:#eaf9ff;border-color:rgba(79,214,255,.7);}',
      '.hud-main .wb-doc{overflow:visible;height:auto;min-height:0;padding-right:0;gap:12px;}',
      '.hud-main .wb-p{color:#cfe9ff;}',
      '.hud-main .wb-label{color:#7fb6dd;}',
      '.hud-main .wb-label::before{background:#3fd0ff;}',
      '.hud-main .wb-list{color:#cfe9ff;}',
      '.hud-main .wb-list li::marker{color:#3fd0ff;}',
      '.hud-main .wb-check-row{color:#cfe9ff;}',
      '.hud-main .wb-check-box{border-color:rgba(63,208,255,.55);background:rgba(10,40,70,.6);}',
      '.hud-main .wb-code{background:rgba(4,18,34,.82);border-color:rgba(63,180,255,.24);}',
      '.hud-main .wb-code pre{color:#cfe9ff;}',
      '.hud-main .wb-quote{background:rgba(10,40,70,.45);border-left-color:#3fd0ff;color:#a8cfe8;}',
      '.hud-main .wb-sec{background:linear-gradient(180deg,rgba(8,30,54,.9),rgba(5,20,38,.92));border-color:rgba(63,180,255,.28);box-shadow:inset 0 0 22px rgba(30,140,255,.08);}',
      '.hud-main .wb-sec-head{border-bottom-color:rgba(63,180,255,.2);}',
      '.hud-main .wb-sec-code{background:rgba(10,46,80,.8);border-color:rgba(79,214,255,.5);color:#4fd6ff;}',
      '.hud-main .wb-sec-title{color:#dceeff;}',
      '.hud-main .wb-sub-title{color:#cfe9ff;}',
      '.hud-main .wb-sub-title::before{background:#3fd0ff;}',
      '.hud-main .wb-table-wrap{background:rgba(4,16,30,.7);border-color:rgba(63,180,255,.25);}',
      '.hud-main .wb-table th{background:rgba(14,46,80,.9);color:#8fc9ec;border-bottom-color:rgba(63,180,255,.25);}',
      '.hud-main .wb-table td{color:#cfe9ff;border-bottom-color:rgba(63,180,255,.14);}',
      '.hud-main .wb-table tbody tr:nth-child(even){background:rgba(10,36,64,.55);}',
      '.hud-main .wb-table .wb-td-key{color:#dceeff;}',
      '.hud-main .wb-ok{color:#2ce6c0;}',
      '.hud-main .wb-no{color:#ff5d67;}',
      '.hud-main .wb-notice{background:rgba(8,28,50,.8);border-color:rgba(63,180,255,.28);color:#a8cfe8;}',
      '.hud-main .wb-detail{color:#a8cfe8;}',
      '.hud-main .wb-hint{color:#ffc247;}',
      '.hud-main .wb-button{background:rgba(10,42,72,.75);border-color:rgba(63,180,255,.4);color:#bfe8ff;}',
      '.hud-main .wb-error{border-color:rgba(255,93,103,.6);color:#ff9aa2;}',
      '@media (max-width:1180px){.hud-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}.hud-row{grid-template-columns:1fr;}}',
      '@media (max-width:720px){.hud-kpis{grid-template-columns:1fr;}.hud-top{flex-wrap:wrap;}}',
      '.hud-dash{display:flex;flex-direction:column;gap:12px;min-width:0;}',
      '.hud-live-state{display:inline-flex;align-items:center;gap:5px;margin-left:4px;font-family:' + MONO + ';font-size:9px;letter-spacing:.08em;color:#7fb6dd;white-space:nowrap;}',
      '.hud-live-dot{width:6px;height:6px;border-radius:50%;background:#6f9cc4;}',
      '.hud-live-state.on{color:#2ce6c0;}',
      '.hud-live-state.on .hud-live-dot{background:#2ce6c0;box-shadow:0 0 8px #2ce6c0;animation:hud-pulse 1.6s ease-in-out infinite;}',
      '.hud-live-state.err{color:#ff5d67;}',
      '.hud-live-state.err .hud-live-dot{background:#ff5d67;box-shadow:0 0 8px #ff5d67;}',
      '.hud-live-state.warn{color:#ffc247;}',
      '.hud-live-state.warn .hud-live-dot{background:#ffc247;box-shadow:0 0 8px #ffc247;}',
      '@keyframes hud-pulse{0%,100%{opacity:1;}50%{opacity:.3;}}',
      '.hud-live-grid{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,.75fr) minmax(0,1.5fr);gap:12px;align-items:stretch;}',
      '.hud-live-metric{position:relative;display:flex;align-items:center;justify-content:center;border:1px solid rgba(63,180,255,.18);background:rgba(8,30,54,.5);border-radius:2px;padding:6px;min-height:128px;}',
      '.hud-live-metric svg{display:block;width:100%;max-width:150px;height:auto;}',
      '.hud-live-read{position:absolute;left:0;right:0;bottom:30px;text-align:center;pointer-events:none;}',
      '.hud-live-num{font-family:' + MONO + ';font-size:22px;font-weight:700;line-height:1;color:#f2fbff;text-shadow:0 0 12px rgba(63,208,255,.7);}',
      '.hud-live-unit{font-size:10px;color:#7fd3ff;margin-left:2px;}',
      '.hud-live-label{position:absolute;left:0;right:0;bottom:10px;text-align:center;font-size:9.5px;letter-spacing:.06em;color:#8fc9ec;}',
      '.hud-live-sub{position:absolute;left:0;right:0;bottom:2px;text-align:center;font-size:8.5px;color:#5f8fb5;}',
      '.hud-live-side{display:flex;flex-direction:column;gap:8px;min-width:0;}',
      '.hud-live-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}',
      '.hud-live-kvitem{display:flex;align-items:baseline;justify-content:space-between;gap:6px;border:1px solid rgba(63,180,255,.2);background:rgba(10,40,70,.45);border-radius:2px;padding:4px 8px;min-width:0;}',
      '.hud-live-kvl{font-size:9px;color:#6f9cc4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-live-kvv{font-family:' + MONO + ';font-size:12px;color:#d8f2ff;white-space:nowrap;}',
      '.hud-spark{flex:1 1 auto;display:flex;flex-direction:column;gap:3px;border:1px solid rgba(63,180,255,.18);background:rgba(8,30,54,.45);border-radius:2px;padding:6px 8px;min-height:0;}',
      '.hud-spark-head{display:flex;align-items:center;justify-content:space-between;font-size:9px;letter-spacing:.06em;color:#7fb6dd;}',
      '.hud-spark svg{display:block;width:100%;height:40px;}',
      '.hud-spark-legend{display:flex;gap:12px;font-size:8.5px;color:#5f8fb5;}',
      '.hud-spark-key{display:inline-flex;align-items:center;gap:4px;}',
      '.hud-spark-key i{display:inline-block;width:10px;height:2px;border-radius:1px;}',
      '.hud-ticker{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px dashed rgba(63,180,255,.16);}',
      '.hud-ticker-label{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#7fb6dd;}',
      '.hud-ticker-item{font-family:' + MONO + ';font-size:9.5px;color:#9fd0ef;border:1px solid rgba(63,180,255,.22);background:rgba(10,40,70,.45);border-radius:2px;padding:1px 7px;white-space:nowrap;}',
      '.hud-ticker-item.now{color:#2ce6c0;border-color:rgba(44,230,192,.4);}',
      '.hud-live-error{margin-top:8px;font-size:9.5px;color:#ff9aa2;}',
      '.hud-live-info{color:#7fb6dd;}',
      '.hud-team{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}',
      '.hud-member{font-size:9px;letter-spacing:.03em;border:1px solid rgba(63,180,255,.25);border-radius:2px;padding:1px 6px;color:#bfe8ff;background:rgba(10,40,70,.4);white-space:nowrap;}',
      '.hud-member.running{border-color:rgba(44,230,192,.55);color:#2ce6c0;}',
      '.hud-member.provisioning{border-color:rgba(255,194,71,.55);color:#ffc247;}',
      '.hud-member.failed{border-color:rgba(255,93,103,.6);color:#ff8a92;}',
      '.hud-member.inactive{color:#7fb6dd;}',
      '.hud-member b{font-weight:600;}',
      '.hud-sectionlabel{display:flex;align-items:center;gap:10px;margin:2px 0 0;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#5f8fb5;}',
      '.hud-sectionlabel::before,.hud-sectionlabel::after{content:"";flex:1 1 auto;height:1px;background:linear-gradient(90deg,rgba(63,180,255,.35),rgba(63,180,255,.05));}',
      '.hud-node.hud-status-running{border-color:rgba(44,230,192,.7);box-shadow:0 0 14px rgba(44,230,192,.3);}',
      '.hud-node.hud-status-provisioning{border-color:rgba(255,194,71,.7);box-shadow:0 0 12px rgba(255,194,71,.25);}',
      '.hud-node.hud-status-failed{border-color:rgba(255,93,103,.75);box-shadow:0 0 12px rgba(255,93,103,.3);}',
      '.hud-node.hud-status-inactive{border-color:rgba(63,180,255,.35);opacity:.78;}',
      '.hud-task-counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px;}',
      '.hud-task-count{display:flex;flex-direction:column;align-items:center;gap:1px;border:1px solid rgba(63,180,255,.2);background:rgba(10,40,70,.45);border-radius:2px;padding:5px 4px;min-width:0;}',
      '.hud-task-countv{font-family:' + MONO + ';font-size:15px;font-weight:700;color:#eaf9ff;}',
      '.hud-task-countl{font-size:8.5px;letter-spacing:.04em;color:#6f9cc4;white-space:nowrap;}',
      '.hud-task-count.hud-task-ready .hud-task-countv{color:#ffc247;}',
      '.hud-task-count.hud-task-running .hud-task-countv{color:#2ce6c0;}',
      '.hud-task-list{display:flex;flex-direction:column;gap:4px;max-height:118px;overflow:auto;}',
      '.hud-task-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center;padding:3px 0;border-bottom:1px dashed rgba(63,180,255,.12);}',
      '.hud-task-row:last-child{border-bottom:none;}',
      '.hud-task-sub{font-size:10px;color:#cfe9ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-task-owner{font-size:8.5px;color:#7fb6dd;border:1px solid rgba(63,180,255,.25);border-radius:2px;padding:0 4px;}',
      '.hud-task-status{font-size:8.5px;letter-spacing:.03em;border:1px solid rgba(63,180,255,.3);border-radius:2px;padding:0 5px;color:#7fb6dd;white-space:nowrap;}',
      '.hud-task-status.hud-task-pending{color:#8fc9ec;}',
      '.hud-task-status.hud-task-in_progress{color:#2ce6c0;border-color:rgba(44,230,192,.5);}',
      '.hud-task-status.hud-task-completed{color:#5f8fb5;border-color:rgba(95,143,181,.4);}',
      '.hud-task-empty{padding:10px 0;text-align:center;font-size:10px;color:#5f8fb5;}',
      '.hud-spark-wide{min-height:88px;}',
      '.hud-live-kv4{grid-template-columns:repeat(2,minmax(0,1fr));}',
      '.hud-live-grid{grid-template-columns:minmax(0,2fr) minmax(200px,1fr);align-items:stretch;}',
      '.hud-node-ghost{border-style:dashed;border-color:rgba(127,182,221,.45);color:#7fb6dd;opacity:.72;}',
      '.hud-node-tasks{font-style:normal;font-family:' + MONO + ';font-size:8px;margin-left:5px;padding:0 4px;border-radius:2px;background:rgba(63,208,255,.16);color:#9fd0ef;}',
      '.hud-memberlist{display:flex;flex-direction:column;gap:3px;margin:8px 0 2px;}',
      '.hud-member-row{display:grid;grid-template-columns:minmax(0,1fr) 88px 44px 46px;gap:6px;align-items:center;padding:2px 0;border-bottom:1px dashed rgba(63,180,255,.12);}',
      '.hud-member-row:last-child{border-bottom:none;}',
      '.hud-member-name{font-size:9.5px;color:#d8f2ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-member-model{font-family:' + MONO + ';font-size:8.5px;color:#6f9cc4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-member-tasks{font-family:' + MONO + ';font-size:8.5px;color:#8fc9ec;white-space:nowrap;text-align:right;}',
      '.hud-member-status{font-size:8.5px;text-align:right;white-space:nowrap;}',
      '.hud-member-status.hud-status-running{color:#2ce6c0;}',
      '.hud-member-status.hud-status-provisioning{color:#ffc247;}',
      '.hud-member-status.hud-status-failed{color:#ff8a92;}',
      '.hud-member-status.hud-status-inactive{color:#7fb6dd;}',
      '.hud-session-list{margin-top:8px;display:flex;flex-direction:column;gap:3px;}',
      '.hud-session-head{font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:#6f9cc4;}',
      '.hud-session-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px dashed rgba(63,180,255,.1);font-family:' + MONO + ';font-size:9.5px;color:#cfe9ff;}',
      '.hud-session-row:last-child{border-bottom:none;}',
      '.hud-session-tokens{color:#ffc247;}',
      '.hud-card .hud-gauge svg{height:104px;width:auto;max-width:100%;}',
      '.hud-card .hud-gaugeread{bottom:2px;}',
      '.hud-card .hud-gaugehint{margin-top:6px;position:relative;z-index:1;}',
      '.hud-kpis .hud-card{padding-bottom:10px;}',
      '.hud-sessrow{display:grid;grid-template-columns:56px minmax(0,1fr) 52px 46px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px dashed rgba(63,180,255,.12);}',
      '.hud-sessrow:last-child{border-bottom:none;}',
      '.hud-sessid{font-family:' + MONO + ';font-size:9.5px;color:#9fd0ef;}',
      '.hud-sessbar{height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;}',
      '.hud-sessfill{height:100%;border-radius:3px;background:linear-gradient(90deg,#2ce6c0,#3fd0ff);}',
      '.hud-sesstok{font-family:' + MONO + ';font-size:9.5px;color:#eaf9ff;text-align:right;}',
      '.hud-sessev{font-family:' + MONO + ';font-size:8.5px;color:#6f9cc4;text-align:right;}',
      '.hud-routerow2{display:flex;flex-direction:column;gap:4px;padding:4px 0;border-bottom:1px dashed rgba(63,180,255,.12);}',
      '.hud-routerow2:last-child{border-bottom:none;}',
      '.hud-routetop{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}',
      '.hud-rolename{font-size:10.5px;font-weight:600;color:#d8f2ff;}',
      '.hud-routemodel{font-family:' + MONO + ';font-size:9px;color:#8fe3ff;border:1px solid rgba(63,180,255,.3);border-radius:2px;padding:0 5px;white-space:nowrap;}',
      '.hud-routestatus{margin-left:auto;font-size:8.5px;color:#6f9cc4;white-space:nowrap;}',
      '.hud-routerow2 .hud-routebar{height:4px;}',
      '.hud-task-counts{grid-template-columns:repeat(3,minmax(0,1fr));}',
      '.hud-task-clear{display:flex;flex-direction:column;align-items:center;gap:2px;padding:16px 0 10px;}',
      '.hud-task-clearv{font-family:' + MONO + ';font-size:34px;font-weight:700;line-height:1;color:#2ce6c0;text-shadow:0 0 16px rgba(44,230,192,.55);}',
      '.hud-task-cleart{font-size:11px;letter-spacing:.06em;color:#bfe8ff;}',
      '.hud-task-clearsub{font-size:9px;color:#5f8fb5;}',
      '.hud-treerow{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;width:100%;}',
      '.hud-treerow .hud-node{font-size:9.5px;padding:2px 8px;}',
      '.hud-clear-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding-top:8px;border-top:1px dashed rgba(63,180,255,.16);}',
      '.hud-clear-text{font-size:9.5px;color:#9fc6e6;}',
      '.hud-clear-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;padding:6px 8px;border:1px solid rgba(255,93,103,.5);border-radius:2px;background:rgba(255,80,90,.08);}',
      '.hud-clear-msg{margin-top:8px;font-size:9.5px;color:#2ce6c0;}',
      '.hud-clear-msg.err{color:#ff9aa2;}',
      '.hud-btn-danger{border-color:rgba(255,93,103,.6);color:#ffb3b8;background:rgba(255,80,90,.12);}',
      '.hud-btn-danger:hover{border-color:#ff5d67;color:#fff;}',
      '.hud-archive{display:flex;flex-direction:column;gap:4px;margin-top:8px;padding-top:8px;border-top:1px dashed rgba(63,180,255,.16);}',
      '.hud-archive-list{display:flex;flex-direction:column;gap:3px;max-height:132px;overflow:auto;padding:2px 0;}',
      '.hud-archive-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center;padding:3px 0;border-bottom:1px dashed rgba(63,180,255,.1);}',
      '.hud-archive-row:last-child{border-bottom:none;}',
      '.hud-archive-sub{font-size:10px;color:#cfe9ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.hud-archive-owner{font-size:8.5px;color:#7fb6dd;border:1px solid rgba(63,180,255,.25);border-radius:2px;padding:0 4px;}',
      '.hud-archive-actions{display:flex;align-items:center;gap:6px;}',
      '.hud-btn-slim{font-size:9.5px;padding:2px 7px;}',
      '@media (max-width:1180px){.hud-live-grid{grid-template-columns:1fr 1fr;}.hud-live-side{grid-column:1/-1;}}',
      '@media (max-width:720px){.hud-live-grid{grid-template-columns:1fr;}}',
    ].join('')

    const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/

    function errorText(error) {
      if (!error) return 'unknown error'
      return error.message || String(error)
    }

    function createText(locale) {
      if (locale && typeof locale.bind === 'function') {
        try {
          return locale.bind(NS)
        } catch (error) {
          /* fall through to the inline fallback */
        }
      }
      return function translate(key) {
        return DICTS.zh[key] || DICTS.en[key] || key
      }
    }

    function useLocaleRevision(locale) {
      const [revision, setRevision] = React.useState(0)
      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => setRevision((value) => value + 1))
      }, [locale])
      return revision
    }

    // The panel ships its own structured copy (arrays, numeric ratios) which the
    // locale dictionary type does not carry, so it picks the dictionary by the
    // active locale id instead of routing every value through translate().
    function pickDict(locale) {
      try {
        const snapshot =
          locale && typeof locale.getSnapshot === 'function'
            ? locale.getSnapshot()
            : locale && typeof locale.getLocale === 'function'
              ? locale.getLocale()
              : null
        const active = snapshot && typeof snapshot.active === 'string' ? snapshot.active : ''
        return /^en/i.test(active) ? DICTS.en : DICTS.zh
      } catch (error) {
        return DICTS.zh
      }
    }

    // Join hard-wrapped lines: no space at CJK boundaries, no space after a
    // hyphenated break, a space before ASCII words.
    function joinText(previous, next) {
      if (!previous) return next
      if (!next) return previous
      const last = previous.slice(-1)
      const first = next.slice(0, 1)
      if (last === '-' || last === '—') return previous + next
      if (CJK.test(last) && CJK.test(first)) return previous + next
      if (/^[，。；：、）】》」』]/.test(first)) return previous + next
      return previous + ' ' + next
    }

    function trimBlank(lines) {
      let start = 0
      let end = lines.length
      while (start < end && lines[start].trim() === '') start += 1
      while (end > start && lines[end - 1].trim() === '') end -= 1
      return lines.slice(start, end)
    }

    // ---- document model ----------------------------------------------------
    // The source is an ASCII-laid-out specification, not Markdown. It is parsed
    // into sections, subsections and typed blocks (tables, checklists, lists,
    // diagrams, labels, paragraphs) so the panel can render real UI instead of
    // a wall of monospace text.

    const RE_SECTION = /^第([〇一二三四五六七八九十0-9]+)节\s*(.*)$/
    const RE_SUBSECTION = /^【(.+)】$/
    const RE_RULE = /^[=\-]{5,}$/
    const RE_DASH_RULE = /^-{5,}$/
    const RE_CHECK = /^\[([ xX])\]\s*(.*)$/
    const RE_BULLET = /^[-*+]\s+(.*)$/
    const RE_ORDERED = /^(\d+)[.)]\s+(.*)$/
    const RE_QUOTE = /^>\s?(.*)$/
    const RE_ART = /[─│┌┐└┘├┤┬┴┼]/
    const RE_PIPE_SEP = /^[-+ ]{5,}$/

    function splitSections(md) {
      const lines = md.replace(/\r\n/g, '\n').split('\n')
      const preface = []
      const sections = []
      let current = null
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].replace(/\s+$/, '')
        const trimmed = line.trim()
        if (/^={5,}$/.test(trimmed)) continue
        const matched = RE_SECTION.exec(trimmed)
        if (matched) {
          current = { code: '第' + matched[1] + '节', title: matched[2].trim(), lines: [] }
          sections.push(current)
          continue
        }
        if (current) current.lines.push(line)
        else preface.push(line)
      }
      return { preface: trimBlank(preface), sections: sections }
    }

    function splitCells(line) {
      return line.split('|').map(function (cell) {
        // A stray full-width border glyph can survive inside a wrapped cell.
        return cell.replace(/│/g, '').trim()
      })
    }

    function normalizeRow(cells, width) {
      const row = []
      for (let i = 0; i < width; i += 1) row.push(typeof cells[i] === 'string' ? cells[i].trim() : '')
      return row
    }

    function buildCells(cellRows, width) {
      const cells = []
      for (let i = 0; i < width; i += 1) cells.push('')
      for (let i = 0; i < cellRows.length; i += 1) {
        const parts = cellRows[i]
        for (let j = 0; j < width && j < parts.length; j += 1) {
          const value = parts[j]
          if (!value) continue
          cells[j] = cells[j] ? joinText(cells[j], value) : value
        }
      }
      return cells
    }

    function parseBoxTable(lines, start) {
      const columnCount = (lines[start].match(/┬/g) || []).length + 1
      const rows = []
      let current = null
      let i = start + 1
      while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()
        if (trimmed.charAt(0) === '└') {
          if (current) rows.push(current)
          current = null
          i += 1
          break
        }
        if (trimmed.charAt(0) === '├') {
          if (current) rows.push(current)
          current = null
          i += 1
          continue
        }
        if (trimmed.charAt(0) === '│') {
          if (!current) {
            current = []
            for (let c = 0; c < columnCount; c += 1) current.push('')
          }
          const parts = line.split('│')
          for (let p = 1; p < parts.length - 1; p += 1) {
            const index = p - 1
            if (index >= columnCount) break
            const value = parts[p].trim()
            if (!value) continue
            current[index] = current[index] ? joinText(current[index], value) : value
          }
        }
        i += 1
      }
      if (current) rows.push(current)
      const header = rows.length > 0 ? normalizeRow(rows[0], columnCount) : []
      const body = []
      for (let r = 1; r < rows.length; r += 1) body.push(normalizeRow(rows[r], columnCount))
      return { block: { kind: 'table', variant: 'grid', header: header, rows: body }, next: i }
    }

    function isPipeHeader(lines, index) {
      const line = lines[index]
      if (typeof line !== 'string' || line.indexOf('|') === -1) return false
      const next = lines[index + 1]
      if (typeof next !== 'string') return false
      const trimmed = next.trim()
      return trimmed.indexOf('+') !== -1 && RE_PIPE_SEP.test(trimmed)
    }

    function parsePipeTable(lines, start) {
      const header = splitCells(lines[start])
      const width = header.length
      const data = []
      const separators = []
      let i = start + 1
      while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()
        if (trimmed === '') break
        if (RE_DASH_RULE.test(trimmed)) break
        if (trimmed.indexOf('+') !== -1 && RE_PIPE_SEP.test(trimmed)) {
          separators.push(data.length)
          i += 1
          continue
        }
        if (line.indexOf('|') === -1) break
        data.push(splitCells(line))
        i += 1
      }
      const rows = []
      if (separators.length >= 3) {
        let cursor = 0
        for (let s = 0; s < separators.length; s += 1) {
          const at = separators[s]
          if (at > cursor) rows.push(normalizeRow(buildCells(data.slice(cursor, at), width), width))
          cursor = at
        }
        if (cursor < data.length) rows.push(normalizeRow(buildCells(data.slice(cursor), width), width))
      } else {
        let current = null
        for (let d = 0; d < data.length; d += 1) {
          const cells = data[d]
          let hasContent = false
          for (let c = 1; c < cells.length; c += 1) if (cells[c] !== '') hasContent = true
          if (current === null || (cells[0] !== '' && hasContent)) {
            if (current) rows.push(normalizeRow(current, width))
            current = cells.slice()
            continue
          }
          for (let c = 0; c < cells.length && c < width; c += 1) {
            const value = cells[c]
            if (!value) continue
            current[c] = current[c] ? joinText(current[c], value) : value
          }
        }
        if (current) rows.push(normalizeRow(current, width))
      }
      return { block: { kind: 'table', variant: 'pipe', header: normalizeRow(header, width), rows: rows }, next: i }
    }

    function isPreStart(lines, index) {
      const line = lines[index]
      if (typeof line !== 'string') return false
      const trimmed = line.trim()
      if (trimmed === '') return false
      if (RE_ART.test(trimmed)) return true
      if (/^#{1,3}\s/.test(trimmed)) return true
      if (/^\s{2,}\S/.test(line)) return true
      if (/\\$/.test(trimmed) && typeof lines[index + 1] === 'string' && /[├└]/.test(lines[index + 1])) return true
      return false
    }

    function collectPre(lines, start) {
      const out = []
      let i = start
      while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()
        if (trimmed === '') break
        if (RE_RULE.test(trimmed)) break
        if (RE_SUBSECTION.test(trimmed) || RE_SECTION.test(trimmed)) break
        out.push(line.replace(/\s+$/, ''))
        i += 1
      }
      // Dedent by the common indentation so a diagram keeps its relative layout
      // while not floating in the middle of the card.
      let indent = -1
      for (let j = 0; j < out.length; j += 1) {
        if (out[j].trim() === '') continue
        const leading = out[j].length - out[j].replace(/^ +/, '').length
        if (indent === -1 || leading < indent) indent = leading
      }
      if (indent > 0) {
        for (let j = 0; j < out.length; j += 1) out[j] = out[j].slice(indent)
      }
      return { lines: out, next: i }
    }

    function collectList(lines, start, pattern, withText) {
      const items = []
      let i = start
      while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()
        const matched = pattern.exec(trimmed)
        if (matched) {
          items.push(withText ? matched[2].trim() : matched[1].trim())
          i += 1
          continue
        }
        if (trimmed === '') break
        if (/^\s{2,}\S/.test(line) && items.length > 0) {
          items[items.length - 1] = joinText(items[items.length - 1], trimmed)
          i += 1
          continue
        }
        break
      }
      return { items: items, next: i }
    }

    function isBlockStart(lines, index) {
      const line = lines[index]
      if (typeof line !== 'string') return true
      const trimmed = line.trim()
      if (trimmed === '') return true
      if (RE_RULE.test(trimmed)) return true
      if (RE_SUBSECTION.test(trimmed)) return true
      if (trimmed.charAt(0) === '┌') return true
      if (isPipeHeader(lines, index)) return true
      if (RE_CHECK.test(trimmed) || RE_BULLET.test(trimmed) || RE_ORDERED.test(trimmed) || RE_QUOTE.test(trimmed)) return true
      if (isPreStart(lines, index)) return true
      return false
    }

    function decorate(blocks) {
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i]
        if (block.kind !== 'paragraph') continue
        if (!/[：:]$/.test(block.text)) continue
        if (block.text.length > 60) continue
        const next = blocks[i + 1]
        if (!next) continue
        if (next.kind === 'list' || next.kind === 'checklist' || next.kind === 'table' || next.kind === 'pre' || next.kind === 'quote') {
          block.kind = 'label'
        }
      }
      return blocks
    }

    function parseBlocks(lines) {
      const blocks = []
      let i = 0
      while (i < lines.length) {
        const line = lines[i]
        const trimmed = line.trim()
        if (trimmed === '') {
          i += 1
          continue
        }
        if (trimmed === '文件结束') {
          i += 1
          continue
        }
        if (RE_RULE.test(trimmed)) {
          i += 1
          continue
        }
        const subsection = RE_SUBSECTION.exec(trimmed)
        if (subsection) {
          blocks.push({ kind: 'subsection', title: subsection[1].trim() })
          i += 1
          continue
        }
        if (trimmed.charAt(0) === '┌' && trimmed.indexOf('┬') !== -1) {
          const parsed = parseBoxTable(lines, i)
          blocks.push(parsed.block)
          i = parsed.next
          continue
        }
        if (isPipeHeader(lines, i)) {
          const parsed = parsePipeTable(lines, i)
          blocks.push(parsed.block)
          i = parsed.next
          continue
        }
        if (RE_CHECK.test(trimmed)) {
          const collected = collectList(lines, i, RE_CHECK, true)
          blocks.push({ kind: 'checklist', items: collected.items })
          i = collected.next
          continue
        }
        if (RE_BULLET.test(trimmed)) {
          const collected = collectList(lines, i, RE_BULLET, false)
          blocks.push({ kind: 'list', ordered: false, items: collected.items })
          i = collected.next
          continue
        }
        if (RE_ORDERED.test(trimmed)) {
          const collected = collectList(lines, i, RE_ORDERED, true)
          blocks.push({ kind: 'list', ordered: true, items: collected.items })
          i = collected.next
          continue
        }
        const quote = RE_QUOTE.exec(trimmed)
        if (quote) {
          blocks.push({ kind: 'quote', text: quote[1].trim() })
          i += 1
          continue
        }
        if (isPreStart(lines, i)) {
          const collected = collectPre(lines, i)
          blocks.push({ kind: 'pre', lines: collected.lines })
          i = collected.next
          continue
        }
        const paragraph = []
        while (i < lines.length) {
          const current = lines[i]
          if (current.trim() === '') break
          if (paragraph.length > 0 && isBlockStart(lines, i)) break
          paragraph.push(current.trim())
          i += 1
        }
        if (paragraph.length > 0) {
          let text = ''
          for (let p = 0; p < paragraph.length; p += 1) text = joinText(text, paragraph[p])
          blocks.push({ kind: 'paragraph', text: text })
        } else {
          i += 1
        }
      }
      return decorate(blocks)
    }

    function parseSectionBody(lines) {
      const groups = []
      let currentGroup = { kind: 'blocks', title: null, lines: [] }
      for (let i = 0; i < lines.length; i += 1) {
        const matched = RE_SUBSECTION.exec(lines[i].trim())
        if (matched) {
          if (currentGroup.lines.length > 0 || currentGroup.title !== null) groups.push(currentGroup)
          currentGroup = { kind: 'subsection', title: matched[1].trim(), lines: [] }
          continue
        }
        currentGroup.lines.push(lines[i])
      }
      groups.push(currentGroup)
      const out = []
      for (let i = 0; i < groups.length; i += 1) {
        const group = groups[i]
        const blocks = parseBlocks(group.lines)
        if (group.kind === 'blocks' && blocks.length === 0) continue
        out.push({ kind: group.kind, title: group.title, blocks: blocks })
      }
      return out
    }

    function parsePreface(lines) {
      const entries = []
      let title = ''
      for (let i = 0; i < lines.length; i += 1) {
        const raw = lines[i]
        const trimmed = raw.trim()
        if (trimmed === '') continue
        if (/^={5,}$/.test(trimmed)) continue
        if (entries.length > 0 && /^\s+\S/.test(raw)) {
          entries[entries.length - 1].v = joinText(entries[entries.length - 1].v, trimmed)
          continue
        }
        const matched = /^([^：:]{1,10})[：:]\s*(.+)$/.exec(trimmed)
        if (matched) {
          entries.push({ k: matched[1].trim(), v: matched[2].trim() })
          continue
        }
        title = title ? joinText(title, trimmed) : trimmed
      }
      return { title: title, entries: entries }
    }

    function buildDocument(md) {
      const split = splitSections(md)
      const sections = split.sections.map(function (section) {
        return {
          code: section.code,
          title: section.title,
          groups: parseSectionBody(section.lines),
        }
      })
      return {
        preface: parsePreface(split.preface),
        sections: sections,
        chars: md.length,
        lines: md.split('\n').length,
      }
    }

    // ---- presentational pieces --------------------------------------------

    function renderCell(cell) {
      if (!cell) return null
      const first = cell.slice(0, 1)
      if (first === '✔') {
        return [h('span', { key: 'g', className: 'wb-ok' }, '✔'), cell.slice(1)]
      }
      if (first === '✗') {
        return [h('span', { key: 'g', className: 'wb-no' }, '✗'), cell.slice(1)]
      }
      return cell
    }

    function Table(props) {
      const table = props.table
      return h(
        'div',
        { className: 'wb-table-wrap' },
        h(
          'table',
          { className: 'wb-table' },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              table.header.map(function (cell, index) {
                return h('th', { key: 'h' + index }, cell)
              }),
            ),
          ),
          h(
            'tbody',
            null,
            table.rows.map(function (row, rowIndex) {
              return h(
                'tr',
                { key: 'r' + rowIndex },
                row.map(function (cell, cellIndex) {
                  return h('td', { key: 'c' + cellIndex, className: cellIndex === 0 ? 'wb-td-key' : undefined }, renderCell(cell))
                }),
              )
            }),
          ),
        ),
      )
    }

    function renderBlock(block, key) {
      if (!block) return null
      if (block.kind === 'paragraph') return h('p', { key: key, className: 'wb-p' }, block.text)
      if (block.kind === 'label') return h('div', { key: key, className: 'wb-label' }, block.text)
      if (block.kind === 'list') {
        return h(
          block.ordered ? 'ol' : 'ul',
          { key: key, className: 'wb-list' },
          block.items.map(function (item, index) {
            return h('li', { key: index }, item)
          }),
        )
      }
      if (block.kind === 'checklist') {
        return h(
          'div',
          { key: key, className: 'wb-check' },
          block.items.map(function (item, index) {
            return h(
              'div',
              { key: index, className: 'wb-check-row' },
              h('span', { className: 'wb-check-box', 'aria-hidden': 'true' }),
              h('span', null, item),
            )
          }),
        )
      }
      if (block.kind === 'table') return h(Table, { key: key, table: block })
      if (block.kind === 'pre') return h('div', { key: key, className: 'wb-code' }, h('pre', null, block.lines.join('\n')))
      if (block.kind === 'quote') return h('blockquote', { key: key, className: 'wb-quote' }, block.text)
      return null
    }

    function SectionCard(props) {
      const section = props.section
      const index = props.index
      const children = [
        h(
          'div',
          { key: 'head', className: 'wb-sec-head' },
          h('span', { className: 'wb-sec-code' }, section.code),
          h('h3', { className: 'wb-sec-title' }, section.title || section.code),
        ),
      ]
      for (let g = 0; g < section.groups.length; g += 1) {
        const group = section.groups[g]
        if (group.kind === 'subsection') {
          const inner = []
          for (let b = 0; b < group.blocks.length; b += 1) inner.push(renderBlock(group.blocks[b], 'g' + g + 'b' + b))
          children.push(h('div', { key: 'g' + g, className: 'wb-sub' }, h('h4', { className: 'wb-sub-title' }, group.title), inner))
        } else {
          for (let b = 0; b < group.blocks.length; b += 1) children.push(renderBlock(group.blocks[b], 'g' + g + 'b' + b))
        }
      }
      return h('section', { className: 'wb-sec', 'data-wb-section': index }, children)
    }

    function Overview(props) {
      const translate = props.t
      const info = props.info
      if (!info || (info.entries.length === 0 && !info.title)) return null
      const metaLabels = translate('metaLabels') || {}
      const bars = translate('bars')
      const metaItems = info.entries.map(function (entry, index) {
        return h(
          'div',
          { key: 'm' + index, className: 'wb-meta-item' },
          h('span', { className: 'wb-meta-k' }, metaLabels[entry.k] || entry.k),
          h('span', { className: 'wb-meta-v' }, entry.v),
        )
      })
      const barNodes = Array.isArray(bars)
        ? bars.map(function (bar, index) {
            const value = typeof bar.value === 'number' ? Math.max(0, Math.min(100, bar.value)) : 0
            return h(
              'div',
              { key: 'b' + index, className: 'wb-bar' },
              h('div', { className: 'wb-bar-head' }, h('span', null, bar.label), h('span', { className: 'wb-bar-v' }, bar.text)),
              h('div', { className: 'wb-bar-track' }, h('div', { className: 'wb-bar-fill', style: { width: value + '%' } })),
            )
          })
        : []
      const barHead = h('div', { key: 'bt', className: 'wb-bars-title' }, translate('barsTitle'))
      return h(
        'div',
        { className: 'wb-overview' },
        h(
          'div',
          { className: 'wb-overview-head' },
          h('span', { className: 'wb-overview-title' }, translate('overviewTitle')),
          info.title ? h('span', { className: 'wb-overview-sub' }, info.title) : null,
        ),
        metaItems.length > 0 ? h('div', { className: 'wb-meta-grid' }, metaItems) : null,
        barNodes.length > 0 ? h('div', { className: 'wb-bars' }, [barHead].concat(barNodes)) : null,
      )
    }

    function SidebarIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 20
      const active = props.active === true
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true',
          focusable: 'false',
          style: {
            display: 'block',
            color: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor',
          },
        },
        h('rect', { x: 9, y: 2.6, width: 6, height: 4.4, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', {
          d: 'M12 7v2.4M4.8 14.6v-2.4a1.2 1.2 0 0 1 1.2-1.2h12a1.2 1.2 0 0 1 1.2 1.2v2.4',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          opacity: 0.7,
        }),
        h('rect', { x: 3, y: 14.6, width: 5.4, height: 4.4, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('rect', { x: 12, y: 14.6, width: 5.4, height: 4.4, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('rect', { x: 19.8, y: 14.6, width: 1.6, height: 4.4, rx: 0.8, fill: 'currentColor', opacity: 0.35 }),
      )
    }

    // ---- console dashboard -------------------------------------------------

    function pointOn(cx, cy, r, t) {
      const degrees = 135 + 270 * t
      const radians = (degrees * Math.PI) / 180
      return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)]
    }

    function arcD(cx, cy, r, t0, t1) {
      const from = pointOn(cx, cy, r, t0)
      const to = pointOn(cx, cy, r, t1)
      const large = (t1 - t0) * 270 > 180 ? 1 : 0
      return (
        'M' + from[0].toFixed(2) + ' ' + from[1].toFixed(2)
        + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + to[0].toFixed(2) + ' ' + to[1].toFixed(2)
      )
    }

    function clamp01(value) {
      if (typeof value !== 'number' || !isFinite(value)) return 0
      return Math.max(0, Math.min(1, value))
    }

    function ArcGauge(props) {
      const ratio = clamp01(props.ratio)
      const color = props.color || '#3fd0ff'
      const cx = 80
      const cy = 78
      const r = 56
      const ticks = []
      for (let i = 0; i <= 20; i += 1) {
        const at = i / 20
        const inner = pointOn(cx, cy, r - 9, at)
        const outer = pointOn(cx, cy, r - 4, at)
        ticks.push(h('line', {
          key: 't' + i,
          x1: inner[0].toFixed(2),
          y1: inner[1].toFixed(2),
          x2: outer[0].toFixed(2),
          y2: outer[1].toFixed(2),
          stroke: at <= ratio + 0.001 ? color : 'rgba(120,190,235,.32)',
          strokeWidth: 1.3,
        }))
      }
      return h(
        'svg',
        { viewBox: '0 0 160 120', 'aria-hidden': 'true' },
        h('path', { d: arcD(cx, cy, r, 0, 1), fill: 'none', stroke: 'rgba(90,160,210,.22)', strokeWidth: 7, strokeLinecap: 'round' }),
        ratio > 0
          ? h('path', {
              d: arcD(cx, cy, r, 0, Math.max(0.001, ratio)),
              fill: 'none',
              stroke: color,
              strokeWidth: 7,
              strokeLinecap: 'round',
              style: { filter: 'drop-shadow(0 0 6px ' + color + ')' },
            })
          : null,
        ticks,
        h('circle', { cx: cx, cy: cy, r: 3, fill: color }),
      )
    }

    function BigDial(props) {
      const ratio = clamp01(props.ratio)
      const cx = 130
      const cy = 130
      const r = 104
      const segments = [[0, 0.55, '#2ce6c0'], [0.55, 0.8, '#3fd0ff'], [0.8, 1, '#8b8cff']]
      const ticks = []
      for (let i = 0; i <= 34; i += 1) {
        const at = i / 34
        const inner = pointOn(cx, cy, r - 8, at)
        const outer = pointOn(cx, cy, r - 2, at)
        ticks.push(h('line', {
          key: 't' + i,
          x1: inner[0].toFixed(2),
          y1: inner[1].toFixed(2),
          x2: outer[0].toFixed(2),
          y2: outer[1].toFixed(2),
          stroke: 'rgba(120,190,235,.32)',
          strokeWidth: 1,
        }))
      }
      const needle = pointOn(cx, cy, r - 18, ratio)
      const hub = pointOn(cx, cy, r * 0.56, ratio)
      return h(
        'svg',
        { viewBox: '0 0 260 260', 'aria-hidden': 'true' },
        h('circle', { cx: cx, cy: cy, r: 116, fill: 'none', stroke: 'rgba(90,160,210,.14)', strokeWidth: 1 }),
        segments.map(function (segment, index) {
          return h('path', {
            key: 's' + index,
            d: arcD(cx, cy, r, segment[0], segment[1]),
            fill: 'none',
            stroke: segment[2],
            strokeWidth: 10,
            opacity: 0.9,
          })
        }),
        h('path', {
          d: arcD(cx, cy, r, 0, Math.max(0.001, ratio)),
          fill: 'none',
          stroke: '#eaf9ff',
          strokeWidth: 2,
          strokeLinecap: 'round',
          opacity: 0.85,
        }),
        ticks,
        h('line', {
          x1: hub[0].toFixed(2),
          y1: hub[1].toFixed(2),
          x2: needle[0].toFixed(2),
          y2: needle[1].toFixed(2),
          stroke: '#eaf9ff',
          strokeWidth: 2.4,
          strokeLinecap: 'round',
          style: { filter: 'drop-shadow(0 0 6px rgba(234,249,255,.85))' },
        }),
        h('circle', { cx: cx, cy: cy, r: 5, fill: '#eaf9ff' }),
      )
    }

    function TechCard(props) {
      const className = 'hud-card' + (props.tone ? ' hud-tone-' + props.tone : '')
      return h(
        'section',
        { className: className, 'data-card': props.card },
        h(
          'div',
          { className: 'hud-cardhead' },
          h('span', { className: 'hud-carddot', 'aria-hidden': 'true' }),
          h('span', { className: 'hud-cardtitle' }, props.title),
          props.badge ? h('span', { className: 'hud-cardbadge' }, props.badge) : null,
        ),
        props.children,
      )
    }

    function RailIcon(props) {
      const common = {
        width: 18,
        height: 18,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }
      if (props.id === 'overview') {
        return h('svg', common,
          h('rect', { key: 'a', x: 3, y: 3, width: 7, height: 7, rx: 1 }),
          h('rect', { key: 'b', x: 14, y: 3, width: 7, height: 7, rx: 1 }),
          h('rect', { key: 'c', x: 3, y: 14, width: 7, height: 7, rx: 1 }),
          h('rect', { key: 'd', x: 14, y: 14, width: 7, height: 7, rx: 1 }),
        )
      }
      if (props.id === 'team') {
        return h('svg', common,
          h('rect', { key: 'r', x: 9, y: 2.5, width: 6, height: 4.5, rx: 1 }),
          h('path', { key: 'l1', d: 'M12 7v3M4.5 14V9.9h15V14' }),
          h('rect', { key: 'a', x: 2.5, y: 14, width: 4.5, height: 4, rx: 0.8 }),
          h('rect', { key: 'b', x: 9.75, y: 14, width: 4.5, height: 4, rx: 0.8 }),
          h('rect', { key: 'c', x: 17, y: 14, width: 4.5, height: 4, rx: 0.8 }),
        )
      }
      if (props.id === 'token') {
        return h('svg', common,
          h('circle', { key: 'a', cx: 8, cy: 8, r: 2.4 }),
          h('circle', { key: 'b', cx: 16, cy: 16, r: 2.4 }),
          h('line', { key: 'l', x1: 5.5, y1: 18.5, x2: 18.5, y2: 5.5 }),
        )
      }
      if (props.id === 'memory') {
        return h('svg', common,
          h('rect', { key: 'a', x: 3, y: 4, width: 18, height: 4.2, rx: 1 }),
          h('rect', { key: 'b', x: 3, y: 10, width: 18, height: 4.2, rx: 1 }),
          h('rect', { key: 'c', x: 3, y: 16, width: 18, height: 4.2, rx: 1 }),
        )
      }
      if (props.id === 'check') {
        return h('svg', common,
          h('path', { key: 'a', d: 'M4 12.5l5 5L20 6.5' }),
        )
      }
      return h('svg', common,
        h('path', { key: 'a', d: 'M6 3h8l3 3v15H6z' }),
        h('path', { key: 'b', d: 'M9 10h6M9 13.5h6M9 17h4' }),
      )
    }

    function Dashboard(props) {
      const data = props.data || DICTS.zh
      const live = props.live || { status: 'idle', data: null, at: 0 }
      const snapshot = live.data || null
      const agents = snapshot && snapshot.agents ? snapshot.agents : null
      const sessions = snapshot && typeof snapshot.sessions === 'number' ? snapshot.sessions : null
      const tokens = snapshot && snapshot.tokens ? snapshot.tokens : null
      const memory = snapshot && snapshot.memory ? snapshot.memory : null
      const team = snapshot && snapshot.team ? snapshot.team : null
      const tasks = team && team.tasks ? team.tasks : null
      const jobs = snapshot && snapshot.jobs ? snapshot.jobs : null
      const members = team && Array.isArray(team.members) ? team.members : []
      const statusLabels = data.statusLabels || {}
      const online = live.status === 'ok'
      const cards = data.cards || {}
      const tree = data.tree || {}
      const mechTiles = data.mechTiles
      const memoryLayers = data.memoryLayers
      const routeRows = data.routeRows
      const clampRatio = clamp01
      const badge = online ? data.liveBadgeShort : data.baselineBadge
      const contextWindow = tokens && typeof tokens.contextWindow === 'number' && tokens.contextWindow > 0 ? tokens.contextWindow : 128000
      const tokenTotal = tokens && typeof tokens.total === 'number' ? tokens.total : null
      const tokenPeak = tokens && typeof tokens.peak === 'number' ? tokens.peak : null
      const sessionsDetail = tokens && Array.isArray(tokens.sessions) ? tokens.sessions : []
      const toolsCount = snapshot && typeof snapshot.tools === 'number' ? snapshot.tools : null
      const nodePeak = tokens && typeof tokens.nodes === 'number' ? tokens.nodes : null
      const eventsTotal = snapshot && typeof snapshot.eventsTotal === 'number' ? snapshot.eventsTotal : null
      const sessionRows = snapshot && Array.isArray(snapshot.sessionList) ? snapshot.sessionList : []
      let maxSessionTokens = 0
      for (let s = 0; s < sessionRows.length; s += 1) {
        if (typeof sessionRows[s].tokens === 'number' && sessionRows[s].tokens > maxSessionTokens) maxSessionTokens = sessionRows[s].tokens
      }

      const kpiDefs = [
        {
          key: 'agents',
          label: data.kpiAgents,
          value: agents ? String(agents.total) : '29',
          unit: '',
          ratio: agents ? Math.min(1, agents.total / 30) : 0.86,
          color: '#3fd0ff',
          hint: agents ? data.liveRoots + ' ' + agents.roots + ' / ' + data.liveChildren + ' ' + agents.children : data.kpiCap,
        },
        {
          key: 'sessions',
          label: data.kpiSessions,
          value: sessions === null ? '--' : String(sessions),
          unit: '',
          ratio: sessions === null ? 0 : Math.min(1, sessions / 8),
          color: '#2ce6c0',
          hint: team && team.counts ? data.liveTeamRunning + ' ' + team.counts.running + ' / ' + members.length : data.kpiSessionsHint,
        },
        {
          key: 'tokens',
          label: data.kpiTokens,
          value: tokenPeak === null ? '--' : formatTokens(tokenPeak),
          unit: '',
          ratio: tokenPeak === null ? 0 : Math.min(1, tokenPeak / contextWindow),
          color: '#ffc247',
          hint: tokenTotal === null ? data.kpiTokensHint : data.kpiTotal + ' ' + formatTokens(tokenTotal),
        },
        {
          key: 'memory',
          label: data.kpiMemory,
          value: memory ? String(Math.round(memory.rss / 1048576)) : '--',
          unit: 'MB',
          ratio: memory ? Math.min(1, memory.rss / 1048576 / 1024) : 0,
          color: '#8b8cff',
          hint: memory ? 'heap ' + Math.round(memory.heapUsed / 1048576) + ' MB' : data.kpiMemoryHint,
        },
      ]

      const kpiNodes = kpiDefs.map(function (kpi) {
        return h(
          TechCard,
          { key: 'kpi-' + kpi.key, card: 'kpi-' + kpi.key, title: kpi.label, badge: badge },
          h(
            'div',
            { className: 'hud-gauge' },
            h(ArcGauge, { ratio: kpi.ratio, color: kpi.color }),
            h(
              'div',
              { className: 'hud-gaugeread' },
              h('span', { className: 'hud-gaugenum' }, kpi.value),
              kpi.unit ? h('span', { className: 'hud-gaugeunit' }, kpi.unit) : null,
            ),
          ),
          h('div', { className: 'hud-gaugehint' }, kpi.hint),
        )
      })

      const links = function (key) {
        return h(
          'div',
          { key: key, className: 'hud-links', 'aria-hidden': 'true' },
          h('span', { className: 'hud-stem' }),
          h('span', { className: 'hud-bus' }),
          [16.6, 50, 83.4].map(function (left, index) {
            return h('span', { key: 'd' + index, className: 'hud-drop', style: { left: left + '%' } })
          }),
        )
      }

      const baselineTree = function () {
        return h(
          'div',
          { className: 'hud-tree' },
          h('div', { className: 'hud-node hud-nodelead' }, tree.lead || 'Lead', h('em', null, tree.leadNote || '')),
          links('l1'),
          h(
            'div',
            { className: 'hud-treerow' },
            [0, 1, 2].map(function (index) {
              return h('div', { key: 's' + index, className: 'hud-node' }, tree.sub || 'SubLead', h('em', null, tree.subNote || ''))
            }),
          ),
          links('l2'),
          h(
            'div',
            { className: 'hud-treerow' },
            [0, 1, 2].map(function (index) {
              return h('div', { key: 'w' + index, className: 'hud-node hud-nodeworker' }, tree.worker || '成员 ×6', h('em', null, tree.workerNote || ''))
            }),
          ),
        )
      }

      const leadMember = members.filter(function (member) { return member.role === 'lead' })[0] || null
      const teammates = members.filter(function (member) { return member.role !== 'lead' }).slice(0, 8)

      const memberNode = function (member, key) {
        const status = member && member.status ? member.status : 'inactive'
        return h(
          'div',
          { key: key, className: 'hud-node hud-status-' + status },
          (member && member.name) || '--',
          h('em', null, member && member.model ? member.model : statusLabels[status] || status),
          member && member.tasks ? h('i', { className: 'hud-node-tasks' }, String(member.tasks)) : null,
        )
      }

      const liveTree = function () {
        const ghostCount = Math.max(0, Math.min(8, 9 - members.length))
        const ghosts = []
        for (let g = 0; g < ghostCount; g += 1) {
          ghosts.push(h('div', { key: 'ghost' + g, className: 'hud-node hud-node-ghost' }, data.ghostSlot, h('em', null, data.ghostHint)))
        }
        return h(
          'div',
          { className: 'hud-tree' },
          leadMember
            ? memberNode(leadMember, 'lead')
            : h('div', { className: 'hud-node hud-node-ghost' }, tree.lead || 'Lead', h('em', null, tree.leadNote || '')),
          links('l1'),
          h('div', { className: 'hud-treerow' }, teammates.map(function (member, index) {
            return memberNode(member, 'm' + index)
          }).concat(ghosts)),
        )
      }

      const memberRows = members.slice(0, 9).map(function (member, index) {
        const status = member && member.status ? member.status : 'inactive'
        return h(
          'div',
          { key: 'ml' + index, className: 'hud-member-row' },
          h('span', { className: 'hud-member-name' }, (member && member.name) || '--'),
          h('span', { className: 'hud-member-model' }, (member && member.model) || '--'),
          h('span', { className: 'hud-member-tasks' }, (data.memberTasks || 'tasks') + ' ' + ((member && member.tasks) || 0)),
          h('span', { className: 'hud-member-status hud-status-' + status }, statusLabels[status] || status),
        )
      })

      const teamCard = h(
        TechCard,
        {
          key: 'team',
          card: 'team',
          title: data.cardTeamLive,
          badge: members.length > 0 ? members.length + ' / ' + (team && team.id ? '#' + team.id : '--') : badge,
        },
        members.length > 0 ? liveTree() : baselineTree(),
        members.length > 0 ? h('div', { className: 'hud-memberlist' }, memberRows) : null,
        h(
          'div',
          { className: 'hud-kv' },
          [
            { label: data.liveTeamRunning, value: team && team.counts ? String(team.counts.running) : '--' },
            { label: data.liveMembers, value: String(members.length) },
            { label: data.taskPending, value: tasks ? String(tasks.pending) : '--' },
            { label: data.taskReady, value: tasks ? String(tasks.ready) : '--' },
          ].map(function (item, index) {
            return h(
              'div',
              { key: 'tv' + index, className: 'hud-kvitem' },
              h('span', { className: 'hud-kvl' }, item.label),
              h('span', { className: 'hud-kvv' }, item.value),
            )
          }),
        ),
        members.length > 0 ? null : h('div', { className: 'hud-hint' }, data.teamFallbackNote),
      )

      const dialRatio = tokenPeak === null ? 0 : Math.min(1, tokenPeak / contextWindow)
      const dialValue = tokenPeak === null ? '--' : (Math.min(100, (tokenPeak / contextWindow) * 100)).toFixed(1) + '%'
      const tokenStatsLive = [
        { value: tokenPeak === null ? '--' : formatTokens(tokenPeak), label: data.kpiPeak },
        { value: tokenTotal === null ? '--' : formatTokens(tokenTotal), label: data.kpiTotal },
        { value: tokens && tokens.model ? tokens.model : '15-35%', label: data.kpiModelLabel },
      ]
      const tokenCard = h(
        TechCard,
        { key: 'token', card: 'token', title: data.cardTokenLive, badge: badge },
        h(
          'div',
          { className: 'hud-dial' },
          h(BigDial, { ratio: dialRatio }),
          h(
            'div',
            { className: 'hud-dialread' },
            h('span', { className: 'hud-dialnum' }, dialValue),
            h('div', { className: 'hud-diallabel' }, data.tokenDialLabel),
          ),
        ),
        h(
          'div',
          { className: 'hud-statrow' },
          tokenStatsLive.map(function (stat, index) {
            return h(
              'div',
              { key: 'ts' + index, className: 'hud-stat' },
              h('div', { className: 'hud-statv' }, stat.value),
              h('div', { className: 'hud-statl' }, stat.label),
            )
          }),
        ),
        h(
          'div',
          { className: 'hud-hint' },
          data.tokenHint + (tokens && typeof tokens.measured === 'number' ? ' · ' + data.liveSessions + ' ' + tokens.measured : ''),
        ),
      )

      const activeTasks = tasks ? tasks.pending + tasks.inProgress : 0
      const taskCard = h(
        TechCard,
        {
          key: 'tasks',
          card: 'tasks',
          title: data.cardTasksLive,
          badge: tasks ? String(activeTasks) : badge,
          tone: '',
        },
        activeTasks > 0
          ? h(
              'div',
              null,
              h(
                'div',
                { className: 'hud-task-counts' },
                [
                  { label: data.taskPending, value: tasks.pending, tone: 'pending' },
                  { label: data.taskInProgress, value: tasks.inProgress, tone: 'running' },
                  { label: data.taskReady, value: tasks.ready, tone: 'ready' },
                ].map(function (item, index) {
                  return h(
                    'div',
                    { key: 'tc' + index, className: 'hud-task-count hud-task-' + item.tone },
                    h('span', { className: 'hud-task-countv' }, String(item.value)),
                    h('span', { className: 'hud-task-countl' }, item.label),
                  )
                }),
              ),
              h(
                'div',
                { className: 'hud-task-list' },
                tasks.items.map(function (item, index) {
                  return h(
                    'div',
                    { key: 'tr' + index, className: 'hud-task-row' },
                    h('span', { className: 'hud-task-sub' }, item.subject || '--'),
                    item.owner ? h('span', { className: 'hud-task-owner' }, item.owner) : null,
                    h(
                      'span',
                      { className: 'hud-task-status hud-task-' + item.status },
                      (data.statusLabels && data.statusLabels[item.status]) || item.status,
                    ),
                  )
                }),
              ),
            )
          : h(
              'div',
              { className: 'hud-task-clear' },
              h('div', { className: 'hud-task-clearv' }, '0'),
              h('div', { className: 'hud-task-cleart' }, data.taskCleared),
              tasks && tasks.completed > 0
                ? null
                : h('div', { className: 'hud-task-clearsub' }, data.taskNone),
            ),
        h('div', { className: 'hud-hint' }, data.taskAutoNote),
        tasks && tasks.completed > 0
          ? h(ArchiveClear, { data: data, completed: tasks.completed, archive: tasks.archive })
          : null,
      )

      const routeLive =
        members.length > 0
          ? members.slice(0, 5).map(function (member) {
              const status = member.status || 'inactive'
              return {
                role: member.name || '--',
                model: member.model || '--',
                note: statusLabels[status] || status,
                ratio: status === 'running' ? 1 : status === 'provisioning' ? 0.55 : 0.2,
              }
            })
          : routeRows
      const routeCard = h(
        TechCard,
        { key: 'route', card: 'route', title: cards.route, badge: members.length > 0 ? data.liveBadgeShort : badge },
        h(
          'div',
          { className: 'hud-route' },
          (Array.isArray(routeLive) ? routeLive : []).map(function (row, index) {
            const ratio = Math.max(2, Math.min(100, Math.round(clampRatio(row.ratio) * 100)))
            return h(
              'div',
              { key: 'rt' + index, className: 'hud-routerow2', title: row.note },
              h(
                'div',
                { className: 'hud-routetop' },
                h('span', { className: 'hud-rolename' }, row.role),
                h('span', { className: 'hud-routemodel' }, row.model),
                h('span', { className: 'hud-routestatus' }, row.note || ''),
              ),
              h('div', { className: 'hud-routebar' }, h('div', { className: 'hud-routefill', style: { width: ratio + '%' } })),
            )
          }),
        ),
        h('div', { className: 'hud-hint' }, members.length > 0 ? data.routeHintLive : data.routeHint),
      )

      const mechTilesLive = [
        { glyph: '◆', label: data.mechTools, value: toolsCount === null ? '--' : String(toolsCount), hint: data.mechToolsHint },
        { glyph: '▣', label: data.mechNodes, value: nodePeak === null ? '--' : String(nodePeak), hint: data.mechNodesHint },
        { glyph: '↻', label: data.mechEvents, value: eventsTotal === null ? '--' : String(eventsTotal), hint: data.mechEventsHint },
        {
          glyph: '⊟',
          label: data.mechSessions,
          value: tokens ? String(tokens.measured) : sessions === null ? '--' : String(sessions),
          hint: data.mechSessionsHint,
        },
      ]
      const mechCard = h(
        TechCard,
        { key: 'mech', card: 'mech', title: data.cardMechLive, badge: online ? data.liveBadgeShort : badge },
        h(
          'div',
          { className: 'hud-tiles' },
          mechTilesLive.map(function (tile, index) {
            return h(
              'div',
              { key: 'm' + index, className: 'hud-tile' },
              h('div', { className: 'hud-tilehead' }, h('span', null, tile.glyph), h('span', null, tile.label)),
              h('div', { className: 'hud-tilevalue' }, tile.value),
              h('div', { className: 'hud-tilehint' }, tile.hint),
            )
          }),
        ),
      )

      const memoryCard = h(
        TechCard,
        {
          key: 'sessions',
          card: 'memory',
          title: data.cardSessionsLive,
          badge: sessionRows.length > 0 ? String(sessionRows.length) : badge,
        },
        sessionRows.length > 0
          ? sessionRows.map(function (row, index) {
              const ratio =
                typeof row.tokens === 'number' && maxSessionTokens > 0
                  ? Math.max(4, Math.round((row.tokens / maxSessionTokens) * 100))
                  : 4
              return h(
                'div',
                { key: 'sr' + index, className: 'hud-sessrow' },
                h('span', { className: 'hud-sessid' }, '#' + row.id),
                h('div', { className: 'hud-sessbar' }, h('div', { className: 'hud-sessfill', style: { width: ratio + '%' } })),
                h('span', { className: 'hud-sesstok' }, typeof row.tokens === 'number' ? formatTokens(row.tokens) : '--'),
                h('span', { className: 'hud-sessev' }, row.events === null || row.events === undefined ? '--' : row.events + ' ev'),
              )
            })
          : h('div', { className: 'hud-task-empty' }, data.sessEmpty),
        h('div', { className: 'hud-hint' }, data.sessHint),
      )

      return [
        h('div', { key: 'kpis', className: 'hud-kpis' }, kpiNodes),
        h('div', { key: 'row1', className: 'hud-row' }, teamCard, tokenCard, taskCard),
        h(LivePanel, {
          key: 'trend',
          data: data,
          live: live,
          history: props.history,
          events: props.events,
          clock: props.clock,
        }),
        h('div', { key: 'row2', className: 'hud-row' }, mechCard, memoryCard, routeCard),
      ]
    }

    // ---- live runtime strip -----------------------------------------------

    function formatTokens(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '--'
      if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
      if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
      return String(Math.round(value))
    }

    function formatUptime(seconds) {
      if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return '--'
      const total = Math.floor(seconds)
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      if (hours > 0) return hours + 'h ' + minutes + 'm'
      if (minutes > 0) return minutes + 'm ' + (total % 60) + 's'
      return total + 's'
    }

    function Sparkline(props) {
      const width = 220
      const height = 40
      const pad = 3
      const series = [
        { values: Array.isArray(props.values) ? props.values : [], color: '#3fd0ff', dashed: false },
        { values: Array.isArray(props.secondary) ? props.secondary : [], color: '#2ce6c0', dashed: true },
      ]
      const lines = series.map(function (entry, index) {
        const values = entry.values
        if (values.length < 2) return null
        let min = values[0]
        let max = values[0]
        for (let i = 1; i < values.length; i += 1) {
          if (values[i] < min) min = values[i]
          if (values[i] > max) max = values[i]
        }
        const span = max - min || 1
        const points = values
          .map(function (value, pointIndex) {
            const x = pad + (pointIndex / (values.length - 1)) * (width - pad * 2)
            const flat = max === min
            const y = flat ? height / 2 : height - pad - ((value - min) / span) * (height - pad * 2)
            return x.toFixed(1) + ',' + y.toFixed(1)
          })
          .join(' ')
        return h('polyline', {
          key: 'line' + index,
          points: points,
          fill: 'none',
          stroke: entry.color,
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: 0.9,
          strokeDasharray: entry.dashed ? '3 3' : undefined,
          style: { filter: 'drop-shadow(0 0 3px ' + entry.color + ')' },
        })
      })
      return h(
        'svg',
        { viewBox: '0 0 ' + width + ' ' + height, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
        h('line', { x1: 0, y1: height - 1, x2: width, y2: height - 1, stroke: 'rgba(63,180,255,.18)', strokeWidth: 1 }),
        lines,
      )
    }

    function LivePanel(props) {
      const dict = props.data || DICTS.zh
      const live = props.live || { status: 'idle', data: null, at: 0 }
      const snapshot = live.data
      const online = live.status === 'ok'
      const team = snapshot && snapshot.team ? snapshot.team : null
      const members = team && Array.isArray(team.members) ? team.members : []
      const jobs = snapshot && snapshot.jobs ? snapshot.jobs : null
      const statusLabels = dict.statusLabels || {}
      const history = props.history || { mem: [], tokens: [] }
      const events = Array.isArray(props.events) ? props.events : []
      const clockText = props.clock ? new Date(props.clock).toLocaleTimeString('zh-CN', { hour12: false }) : '--:--:--'
      const syncText = live.at ? new Date(live.at).toLocaleTimeString('zh-CN', { hour12: false }) : '--:--:--'
      const ageMs = props.clock && live.at ? Math.max(0, props.clock - live.at) : null
      const ageText = ageMs === null ? '--' : ageMs < 1000 ? '<1s' : Math.round(ageMs / 1000) + 's'

      const kv = function (key, label, value) {
        return h(
          'div',
          { key: key, className: 'hud-live-kvitem' },
          h('span', { className: 'hud-live-kvl' }, label),
          h('span', { className: 'hud-live-kvv' }, value),
        )
      }

      return h(
        'section',
        { className: 'hud-card hud-live', 'data-card': 'live' },
        h(
          'div',
          { className: 'hud-cardhead' },
          h('span', { className: 'hud-carddot', 'aria-hidden': 'true' }),
          h('span', { className: 'hud-cardtitle' }, dict.liveTrendTitle),
          h(
            'span',
            {
              className:
                'hud-live-state'
                + (online ? ' on' : live.status === 'error' ? ' err' : live.status === 'unavailable' ? ' warn' : ''),
            },
            h('span', { className: 'hud-live-dot', 'aria-hidden': 'true' }),
            online
              ? dict.liveOnline
              : live.status === 'error'
                ? dict.liveOffline
                : live.status === 'unavailable'
                  ? dict.liveInactive
                  : dict.liveConnecting,
          ),
          h('span', { className: 'hud-cardbadge' }, dict.liveBadge),
        ),
        h(
          'div',
          { className: 'hud-live-grid' },
          h(
            'div',
            { className: 'hud-spark hud-spark-wide' },
            h(
              'div',
              { className: 'hud-spark-head' },
              h('span', null, dict.liveTrend),
              h('span', { className: 'hud-live-kvv' }, clockText),
            ),
            h(Sparkline, { values: history.mem, secondary: history.tokens }),
            h(
              'div',
              { className: 'hud-spark-legend' },
              h('span', { className: 'hud-spark-key' }, h('i', { style: { background: '#3fd0ff' } }), dict.liveMemory),
              h('span', { className: 'hud-spark-key' }, h('i', { style: { background: '#2ce6c0' } }), dict.kpiTokens),
              h('span', null, dict.liveUpd),
            ),
          ),
          h(
            'div',
            { className: 'hud-live-kv hud-live-kv4' },
            kv('s1', dict.liveSync, syncText + (ageText === '--' ? '' : ' · ' + ageText)),
            kv('s2', dict.liveUptime, snapshot ? formatUptime(snapshot.uptime) : '--'),
            kv('s3', dict.liveJobs, jobs ? jobs.running + ' / ' + jobs.total : '--'),
            kv('s4', dict.liveMembers, String(members.length)),
          ),
        ),
        members.length > 0
          ? h(
              'div',
              { className: 'hud-team' },
              members.map(function (member, index) {
                const statusKey = member && member.status ? member.status : 'inactive'
                return h(
                  'span',
                  { key: 'm' + index, className: 'hud-member ' + statusKey, title: member.role },
                  h('b', null, member.name || '--'),
                  ' · ' + (statusLabels[statusKey] || statusKey),
                )
              }),
            )
          : null,
        h(
          'div',
          { className: 'hud-ticker' },
          h('span', { className: 'hud-ticker-label' }, dict.liveEvents),
          events.length > 0
            ? events.map(function (event, index) {
                return h(
                  'span',
                  { key: 'ev' + index, className: 'hud-ticker-item' + (index === 0 ? ' now' : '') },
                  '[' + event.time + '] ' + event.text,
                )
              })
            : h('span', { className: 'hud-ticker-item' }, dict.liveNoEvents),
        ),
        live.status === 'error'
          ? h('div', { className: 'hud-live-error' }, dict.liveOfflineHint)
          : live.status === 'unavailable'
            ? h('div', { className: 'hud-live-error' }, dict.liveUnavailable)
            : live.status !== 'ok'
              ? h('div', { className: 'hud-live-error hud-live-info' }, dict.liveConnectingHint)
              : null,
      )
    }

    function ArchiveClear(props) {
      const data = props.data || DICTS.zh
      const [state, setState] = React.useState({ mode: 'idle', message: '', expanded: false, confirmAll: false, rowConfirm: null })
      const archive = Array.isArray(props.archive) ? props.archive : []
      const busy = state.mode === 'busy'
      const patch = function (next) {
        setState(function (current) {
          return Object.assign({}, current, next)
        })
      }
      const post = function (body, doneText) {
        if (busy) return
        patch({ mode: 'busy', message: '', confirmAll: false })
        let controller = null
        let timer = null
        try {
          controller = typeof AbortController === 'function' ? new AbortController() : null
        } catch (error) {
          controller = null
        }
        try {
          timer = setTimeout(function () {
            try {
              if (controller) controller.abort()
            } catch (error) {
              /* ignore */
            }
          }, 8000)
        } catch (error) {
          timer = null
        }
        const finish = function () {
          if (timer) clearTimeout(timer)
        }
        fetch(ARCHIVE_ROUTE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller ? controller.signal : undefined,
        })
          .then(function (response) {
            return response
              .json()
              .catch(function () {
                return null
              })
              .then(function (payload) {
                return { ok: response.ok, status: response.status, payload: payload }
              })
          })
          .then(function (result) {
            finish()
            if (!result.ok) {
              throw new Error((result.payload && result.payload.error) || 'HTTP ' + result.status)
            }
            const count = result.payload && typeof result.payload.deleted === 'number' ? result.payload.deleted : 0
            patch({ mode: 'idle', message: doneText + ' ' + count, rowConfirm: null })
          })
          .catch(function (error) {
            finish()
            patch({
              mode: 'error',
              message: (data.taskDeleteFailed || 'failed') + '：' + (error && error.message ? error.message : String(error)),
              rowConfirm: null,
            })
          })
      }
      const count = typeof props.completed === 'number' ? props.completed : archive.length
      const rows = archive.map(function (item, index) {
        const confirming = state.rowConfirm === item.id
        return h(
          'div',
          { key: 'ar' + index, className: 'hud-archive-row' },
          h('span', { className: 'hud-archive-sub', title: item.subject || '' }, item.subject || '--'),
          item.owner ? h('span', { className: 'hud-archive-owner' }, item.owner) : null,
          confirming
            ? h(
                'span',
                { className: 'hud-archive-actions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hud-btn hud-btn-slim hud-btn-danger',
                    disabled: busy,
                    onClick: function () {
                      const body = { id: item.id }
                      if (typeof item.revision === 'number') body.revision = item.revision
                      post(body, (data.taskDeleteDone || 'deleted') + ' · ' + (item.subject || item.id))
                    },
                  },
                  data.taskConfirmOne,
                ),
                h(
                  'button',
                  { type: 'button', className: 'hud-btn hud-btn-slim', disabled: busy, onClick: function () { patch({ rowConfirm: null }) } },
                  data.taskCancel,
                ),
              )
            : h(
                'button',
                {
                  type: 'button',
                  className: 'hud-btn hud-btn-slim',
                  disabled: busy,
                  onClick: function () { patch({ rowConfirm: item.id, message: '' }) },
                },
                data.taskDeleteOne,
              ),
        )
      })
      return h(
        'div',
        { className: 'hud-archive' },
        h(
          'div',
          { className: 'hud-clear-row' },
          h('span', { className: 'hud-clear-text' }, data.taskArchiveCount + ' ' + count),
          h(
            'span',
            { className: 'hud-archive-actions' },
            h(
              'button',
              { type: 'button', className: 'hud-btn hud-btn-slim', disabled: busy, onClick: function () { patch({ expanded: !state.expanded, message: '' }) } },
              state.expanded ? data.taskHideArchive : data.taskViewArchive,
            ),
            h(
              'button',
              { type: 'button', className: 'hud-btn hud-btn-slim', disabled: busy, onClick: function () { patch({ confirmAll: true }) } },
              data.taskDeleteArchive,
            ),
          ),
        ),
        state.confirmAll
          ? h(
              'div',
              { className: 'hud-clear-confirm' },
              h('span', { className: 'hud-clear-text' }, data.taskDeleteConfirm + ' · ' + count),
              h(
                'button',
                { type: 'button', className: 'hud-btn hud-btn-danger', disabled: busy, onClick: function () { post({}, data.taskDeleteDone || 'deleted') } },
                data.taskDeleteYes,
              ),
              h(
                'button',
                { type: 'button', className: 'hud-btn', disabled: busy, onClick: function () { patch({ confirmAll: false }) } },
                data.taskCancel,
              ),
            )
          : null,
        state.expanded
          ? h('div', { className: 'hud-archive-list' }, rows.length > 0 ? rows : h('div', { className: 'hud-task-empty' }, data.taskArchiveEmpty))
          : null,
        state.message ? h('div', { className: 'hud-clear-msg' + (state.mode === 'error' ? ' err' : '') }, state.message) : null,
        props.archive !== undefined && !Array.isArray(props.archive) && count > 0
          ? h('div', { className: 'hud-clear-msg err' }, data.taskArchiveUnavailable)
          : null,
      )
    }

    // ---- panel -------------------------------------------------------------

    function createPanel(t, locale) {
      class PanelErrorBoundary extends React.Component {
        constructor(props) {
          super(props)
          this.state = { error: null }
        }

        static getDerivedStateFromError(error) {
          return { error: error }
        }

        render() {
          if (this.state.error) {
            return h(
              'div',
              { className: 'wb-panel' },
              h('style', null, CSS),
              h(
                'div',
                { className: 'wb-notice wb-error' },
                h('p', { className: 'wb-detail' }, t('boundaryTitle') + '：' + errorText(this.state.error)),
                h('p', { className: 'wb-detail' }, t('boundaryHint')),
              ),
            )
          }
          return this.props.children
        }
      }

      function Panel() {
        useLocaleRevision(locale)
        const data = pickDict(locale)
        const [state, setState] = React.useState({ status: 'loading' })
        const [timedOut, setTimedOut] = React.useState(false)
        const [copied, setCopied] = React.useState(false)
        const [view, setView] = React.useState('dashboard')
        const [activeRail, setActiveRail] = React.useState('overview')
        const requestRef = React.useRef(0)
        const scrollerRef = React.useRef(null)
        const copyTimerRef = React.useRef(null)
        const mainRef = React.useRef(null)
        const [live, setLive] = React.useState({ status: 'idle', data: null, at: 0, error: null })
        const [liveHistory, setLiveHistory] = React.useState({ mem: [], tokens: [], agents: [] })
        const [liveEvents, setLiveEvents] = React.useState([])
        const [clock, setClock] = React.useState(function () { return Date.now() })

        const load = React.useCallback(function () {
          const id = requestRef.current + 1
          requestRef.current = id
          setState({ status: 'loading' })
          setTimedOut(false)
          fetch(ROUTE, { cache: 'no-store' })
            .then(function (response) {
              if (!response.ok) throw new Error('HTTP ' + response.status)
              return response.text()
            })
            .then(function (text) {
              if (requestRef.current !== id) return
              setState({ status: 'ready', text: text })
            })
            .catch(function (error) {
              if (requestRef.current !== id) return
              setState({ status: 'error', message: errorText(error) })
            })
        }, [])

        React.useEffect(function () {
          load()
        }, [load])

        React.useEffect(function () {
          if (state.status !== 'loading') return undefined
          const timer = setTimeout(function () {
            setTimedOut(true)
          }, LOAD_TIMEOUT_MS)
          return function () {
            clearTimeout(timer)
          }
        }, [state.status])

        React.useEffect(function () {
          return function () {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
          }
        }, [])

        React.useEffect(function () {
          let cancelled = false
          let source = null
          let fallbackTimer = null
          let fallbackAbort = null
          let previous = null
          let received = false
          let grace = null
          const stamp = function () {
            return new Date().toLocaleTimeString('zh-CN', { hour12: false })
          }
          const pushEvents = function (lines) {
            if (!lines || lines.length === 0) return
            const time = stamp()
            setLiveEvents(function (current) {
              const added = lines.map(function (line) {
                return { time: time, text: line }
              })
              return added.concat(current).slice(0, 8)
            })
          }
          const apply = function (snapshot) {
            if (cancelled) return
            received = true
            setLive({ status: 'ok', data: snapshot, at: Date.now(), error: null })
            const mem = snapshot.memory && typeof snapshot.memory.rss === 'number' ? Math.round(snapshot.memory.rss / 1048576) : null
            const count = snapshot.agents && typeof snapshot.agents.total === 'number' ? snapshot.agents.total : null
            const tokenTotal = snapshot.tokens && typeof snapshot.tokens.total === 'number' ? snapshot.tokens.total : null
            setLiveHistory(function (current) {
              return {
                mem: mem === null ? current.mem : current.mem.concat(mem).slice(-40),
                tokens: tokenTotal === null ? current.tokens : current.tokens.concat(tokenTotal).slice(-40),
                agents: count === null ? current.agents : current.agents.concat(count).slice(-40),
              }
            })
            if (!previous) {
              pushEvents([t('liveOnline')])
            } else {
              const lines = []
              if (typeof previous.sessions === 'number' && typeof snapshot.sessions === 'number' && previous.sessions !== snapshot.sessions) {
                lines.push(t('liveSessions') + ' ' + previous.sessions + ' → ' + snapshot.sessions)
              }
              const prevAgents = previous.agents ? previous.agents.total : null
              const nextAgents = snapshot.agents ? snapshot.agents.total : null
              if (prevAgents !== null && nextAgents !== null && prevAgents !== nextAgents) {
                lines.push(t('liveAgents') + ' ' + prevAgents + ' → ' + nextAgents)
              }
              const prevTeam = previous.team && previous.team.counts ? previous.team.counts.running : null
              const nextTeam = snapshot.team && snapshot.team.counts ? snapshot.team.counts.running : null
              if (prevTeam !== null && nextTeam !== null && prevTeam !== nextTeam) {
                lines.push(t('liveTeamRunning') + ' ' + prevTeam + ' → ' + nextTeam)
              }
              const prevJobs = previous.jobs ? previous.jobs.total : null
              const nextJobs = snapshot.jobs ? snapshot.jobs.total : null
              if (prevJobs !== null && nextJobs !== null && prevJobs !== nextJobs) {
                lines.push(t('liveJobs') + ' ' + prevJobs + ' → ' + nextJobs)
              }
              if (previous.memory && snapshot.memory) {
                const delta = Math.round((snapshot.memory.rss - previous.memory.rss) / 1048576)
                if (delta !== 0) lines.push(t('liveMemory') + ' ' + (delta > 0 ? '+' : '') + delta + ' MB')
              }
              const prevTokens = previous.tokens && typeof previous.tokens.total === 'number' ? previous.tokens.total : null
              const nextTokens = snapshot.tokens && typeof snapshot.tokens.total === 'number' ? snapshot.tokens.total : null
              if (prevTokens !== null && nextTokens !== null && prevTokens !== nextTokens) {
                lines.push(t('kpiTokens') + ' ' + formatTokens(prevTokens) + ' → ' + formatTokens(nextTokens))
              }
              pushEvents(lines)
            }
            previous = snapshot
          }
          const fail = function (error) {
            if (cancelled) return
            const message = errorText(error)
            const unavailable = /HTTP 404/.test(message)
            setLive({ status: unavailable ? 'unavailable' : 'error', data: previous, at: Date.now(), error: message })
            pushEvents([unavailable ? t('liveUnavailable') : t('liveOffline')])
          }
          const pollOnce = function () {
            if (cancelled || fallbackAbort) return
            fallbackAbort = typeof AbortController === 'function' ? new AbortController() : null
            fetch(LIVE_ROUTE, { cache: 'no-store', signal: fallbackAbort ? fallbackAbort.signal : undefined })
              .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status)
                return response.json()
              })
              .then(function (snapshot) {
                fallbackAbort = null
                apply(snapshot)
              })
              .catch(function (error) {
                fallbackAbort = null
                fail(error)
              })
          }
          const startFallback = function () {
            if (cancelled || fallbackTimer) return
            if (source) {
              source.close()
              source = null
            }
            pollOnce()
            fallbackTimer = setInterval(pollOnce, POLL_MS)
          }
          const connect = function () {
            if (cancelled) return
            if (typeof EventSource !== 'function') {
              startFallback()
              return
            }
            try {
              source = new EventSource(STREAM_ROUTE)
            } catch (error) {
              source = null
              startFallback()
              return
            }
            source.onmessage = function (event) {
              if (cancelled) return
              try {
                apply(JSON.parse(event.data))
              } catch (error) {
                /* malformed frame */
              }
            }
            source.onerror = function () {
              if (!cancelled && !received) startFallback()
            }
          }
          grace = setTimeout(function () {
            if (!received) startFallback()
          }, 2500)
          connect()
          return function () {
            cancelled = true
            if (grace) clearTimeout(grace)
            if (source) {
              source.close()
              source = null
            }
            if (fallbackTimer) clearInterval(fallbackTimer)
            if (fallbackAbort) fallbackAbort.abort()
          }
        }, [])

        React.useEffect(function () {
          const timer = setInterval(function () {
            setClock(Date.now())
          }, 1000)
          return function () {
            clearInterval(timer)
          }
        }, [])

        const document = React.useMemo(
          function () {
            return state.status === 'ready' ? buildDocument(state.text) : null
          },
          [state.text],
        )

        function jumpTo(index) {
          const scroller = scrollerRef.current
          if (!scroller) return
          const target = scroller.querySelector('[data-wb-section="' + index + '"]')
          if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }

        function copyAll() {
          if (state.status !== 'ready') return
          const text = state.text
          const done = function () {
            setCopied(true)
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
            copyTimerRef.current = setTimeout(function () {
              setCopied(false)
            }, 1600)
          }
          const fallback = function () {
            try {
              const area = window.document.createElement('textarea')
              area.value = text
              area.setAttribute('readonly', '')
              area.style.position = 'fixed'
              area.style.top = '-1000px'
              window.document.body.appendChild(area)
              area.select()
              window.document.execCommand('copy')
              window.document.body.removeChild(area)
              done()
            } catch (error) {
              /* clipboard unavailable: leave the label unchanged */
            }
          }
          try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
              navigator.clipboard.writeText(text).then(done, fallback)
            } else {
              fallback()
            }
          } catch (error) {
            fallback()
          }
        }

        function selectRail(id) {
          setActiveRail(id)
          if (id === 'doc') {
            setView('doc')
            return
          }
          setView('dashboard')
          window.requestAnimationFrame(function () {
            const main = mainRef.current
            if (!main) return
            if (id === 'overview') {
              main.scrollTop = 0
              return
            }
            const target = main.querySelector('[data-card="' + id + '"]')
            if (target && typeof target.scrollIntoView === 'function') {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          })
        }

        let headerMeta = null
        let nav = null
        let body = null

        if (state.status === 'ready' && document) {
          const shortNames = data.shortNames
          headerMeta =
            document.chars + ' ' + t('chars') + ' · ' + document.lines + ' ' + t('lines') + ' · ' + document.sections.length + ' ' + t('sections')
          nav = h(
            'div',
            { className: 'wb-nav' },
            h('span', { className: 'wb-nav-label' }, t('outline')),
            document.sections.map(function (section, index) {
              const short = Array.isArray(shortNames) ? shortNames[index] : undefined
              return h(
                'button',
                {
                  key: 'nav' + index,
                  type: 'button',
                  className: 'wb-nav-chip',
                  title: section.title || section.code,
                  onClick: function () {
                    jumpTo(index)
                  },
                },
                short ? section.code + ' ' + short : section.code,
              )
            }),
          )
          body =
            document.sections.length > 0
              ? h(
                  'div',
                  { className: 'wb-doc', ref: scrollerRef },
                  document.sections.map(function (section, index) {
                    return h(SectionCard, { key: 'sec' + index, section: section, index: index })
                  }),
                )
              : h('div', { className: 'wb-notice' }, h('p', { className: 'wb-detail' }, t('empty')))
        } else if (state.status === 'error') {
          body = h(
            'div',
            { className: 'wb-notice wb-error' },
            h('p', { className: 'wb-detail' }, t('errorTitle') + '：' + state.message),
            h('button', { type: 'button', className: 'wb-button', onClick: load }, t('retry')),
          )
        } else {
          body = h(
            'div',
            { className: 'wb-notice' },
            h('p', { className: 'wb-detail' }, t('loading')),
            timedOut ? h('p', { className: 'wb-hint' }, t('timeout')) : null,
            timedOut ? h('button', { type: 'button', className: 'wb-button', onClick: load }, t('retry')) : null,
          )
        }

        let docNode = body
        if (state.status === 'ready') {
          docNode = h('div', { className: 'hud-docview' }, nav, body)
        }
        const dashboard = h(Dashboard, {
          data: data,
          live: live,
          history: liveHistory,
          events: liveEvents,
          clock: clock,
        })
        const content = view === 'dashboard' ? dashboard : docNode
        const railItems = data.rail
        const railNodes = (Array.isArray(railItems) ? railItems : []).map(function (item) {
          return h(
            'button',
            {
              key: item.id,
              type: 'button',
              className: 'hud-rail-btn' + (activeRail === item.id ? ' on' : ''),
              title: item.label,
              onClick: function () {
                selectRail(item.id)
              },
            },
            h(RailIcon, { id: item.id }),
            h('span', null, item.label),
          )
        })
        return h(
          'div',
          { className: 'hud-root' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'hud-top' },
            h(
              'div',
              { className: 'hud-brand' },
              h('span', { className: 'hud-logo', 'aria-hidden': 'true' }),
              h(
                'div',
                null,
                h('h2', { className: 'hud-title' }, t('title')),
                h('p', { className: 'hud-subtitle' }, t('subtitle')),
              ),
            ),
            h(
              'div',
              { className: 'hud-topright' },
              headerMeta ? h('span', { className: 'hud-clock' }, headerMeta) : null,
              headerMeta ? h('span', { className: 'hud-clock' }, '·') : null,
              h('span', { className: 'hud-clock' }, t('version')),
              h(
                'div',
                { className: 'hud-switch' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: view === 'dashboard' ? 'on' : '',
                    onClick: function () {
                      setView('dashboard')
                      setActiveRail('overview')
                    },
                  },
                  t('viewOverview'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: view === 'doc' ? 'on' : '',
                    onClick: function () {
                      setView('doc')
                      setActiveRail('doc')
                    },
                  },
                  t('viewDoc'),
                ),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'hud-btn' + (copied ? ' done' : ''),
                  onClick: copyAll,
                  disabled: state.status !== 'ready',
                },
                copied ? t('copied') : t('copy'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'hud-btn',
                  onClick: load,
                  disabled: state.status === 'loading',
                },
                t('refresh'),
              ),
            ),
          ),
          h(
            'div',
            { className: 'hud-body' },
            h('nav', { className: 'hud-rail' }, railNodes),
            h('div', { className: 'hud-main', ref: mainRef }, content),
          ),
        )
      }

      return function PanelRoot() {
        return h(PanelErrorBoundary, null, h(Panel))
      }
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale')
        const t = function (key) {
          const dict = pickDict(locale)
          if (typeof dict[key] === 'string') return dict[key]
          const fallback = DICTS.zh[key]
          return typeof fallback === 'string' ? fallback : key
        }
        const PanelRoot = createPanel(t, locale)

        // 左侧栏底部图标：id 同时作为 main 面板的 key。order 41 让它排在 ARCH-01 之后。
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'workbench-templates',
              order: 41,
              label: () => t('title'),
            },
            SidebarIcon,
          ),
        )

        // 主区面板：与侧栏图标同 key，点击即切换到这里。
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'workbench-templates' }, PanelRoot),
        )
      },
    }
  },
})
