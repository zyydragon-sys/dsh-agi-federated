/**
 * dsh-quota-nexus — Client half (Web)。
 * build: 1.12.2 (card-layout)
 *
 * 在“设置 → Quota Nexus”里渲染卡片列表式供应商管理：
 *   每行 = 提供商名称 + 状态点（已连接/离线/异常）+ 右侧“编辑”“删除”；
 *   列表底部 = “+ 添加模型提供商”。
 * 额度条与状态卡片由 Host 的 SSE 通道 `/quota-nexus/api/events` 推送，
 * 命中后立即刷新，UI 从内存快照直出。
 *
 * 所有文案走 Client 的 locale 服务（缺失时退回内置词典）。
 */

window.__ModuleLoader__.load({
  id: 'dsh-quota-nexus',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState } = React

    /** locale.bind() 的稳定翻译函数；词典缺失时为 null，组件内回落内置词典。 */
    let translateRef = null

    const isZh = () => {
      const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en'
      return lang.toLowerCase().startsWith('zh')
    }

    const NS = 'quota-nexus'
    const BASE = '/quota-nexus'
    /** 构建标记：页面上可见，用于确认浏览器加载的是哪一版客户端模块。 */
    const BUILD_TAG = 'v1.22.4'

    const STRATEGIES = ['priority', 'round-robin', 'balanced', 'sticky']

    const DICT = {
      zh: {
        'section.label': 'Quota Nexus',
        'title': '模型提供商与额度',
        'subtitle': '调度策略、连通性、额度余量与冷却倒计时（0s 实时同步）',
        'add': '+ 添加模型提供商',
        'edit': '编辑',
        'delete': '删除',
        'probe': '检测',
        'cancel': '取消',
        'save': '保存并校验',
        'scan': '扫描本机',
        'import': '导入',
        'empty': '池中没有提供商。点击“+ 添加模型提供商”开始。',
        'loading': '读取中…',
        'loadFailed': '无法读取状态',
        'detail': '详情',
        'strategy': '调度策略',
        'strategy.priority': 'priority（先用完一个号）',
        'strategy.round-robin': 'round-robin（轮询）',
        'strategy.balanced': 'balanced（偏向闲置久的号）',
        'strategy.sticky': 'sticky（同会话固定账号）',
        'tab.apikey': 'API Key',
        'tab.oauth': 'OAuth 扫码/跳转',
        'tab.discovery': '本机客户端发现',
        'field.vendor': '提供商',
        'field.label': '显示名称',
        'field.baseUrl': 'Base URL（OpenAI 兼容协议）',
        'field.baseUrl.anthropic': 'Base URL（Anthropic Messages 协议）',
        'field.baseUrl.both': 'Base URL（OpenAI 兼容协议 / Anthropic Messages 协议）',
        'field.protocol': '接口协议（决定鉴权头）',
        'field.balanceUrl': '余额接口 URL（可选，留空用官方端点）',
        'field.balanceUrl.placeholder': '例如 https://api.deepseek.com/user/balance',
        'field.plan': '套餐类型（订阅模式按周期统计用量）',
        'field.planLimit': '每周期限额',
        'field.plan5h': '5h 限额（可选，对齐官网 5h 窗口）',
        'period.day': '每天重置',
        'period.week': '每周重置',
        'period.month': '每月重置',
        'protocol.auto': '自动（按厂商与 baseUrl 推断）',
        'proto.openai': 'OpenAI 兼容：authorization: Bearer <key> · 端点写到 …/v1',
        'proto.anthropic': 'Anthropic Messages：x-api-key + anthropic-version 2023-06-01 · 端点写到 …/v1',
        'discoveryIdle': '尚未扫描。点“扫描本机”只列出环境变量与客户端快照里的凭据候选，不会自动导入。',
        'field.apiKey': 'API Key',
        'field.validate': '保存前校验连通性',
        'hint.anthropic':
          'Anthropic Messages 协议：鉴权头为 x-api-key + anthropic-version: 2023-06-01。baseUrl 填到 /v1 为止（官方为 https://api.anthropic.com/v1，中转站填其 /v1 地址）。',
        'status.connected': '已连接',
        'status.error': '异常',
        'status.unavailable': '不可用',
        'status.unknown': '未检测',
        'status.disabled': '已停用',
        'status.needs_relogin': '需重新登录',
        'status.rate_limited': '限流中',
        'status.cooldown': '冷却中',
        'status.quota_low': '额度不足',
        'status.unconfigured': '未配置',
        'quotaLeft': '剩余额度',
        'balance': '余额',
        'recharge': '充值 →',
        'usage': '用量明细',
        'models': '模型',
        'modelsNone': '尚未同步模型目录',
        'autoSwitch': '自动切换',
        'planTotal': '总额度',
        'used': '已用',
        'later': '后',
        'usageDetail': '订阅套餐用量详情',
        'range.day': '当日',
        'range.week': '近 7 天',
        'range.month': '近 30 天',
        'total': '累计',
        'peak': '单日峰值',
        'activeDays': '活跃天数',
        'noUsage': '本周期暂无经过插件的调用记录（只有真实调用才会统计）',
        'chipHint': '点击查看明细',
        'close': '收起',
        'detail.live': '0s 实时状态',
        'detail.providers': '供应商明细',
        'detail.rotate': '模型轮转方案',
        'detail.active': '活跃账号',
        'detail.cooldown': '冷却账号',
        'detail.relogin': '待重新登录',
        'detail.ledger': '写入队列',
        'detail.snapshot': '最近快照',
        'detail.pool': '池目录',
        'detail.writable': '可写',
        'detail.readonly': '只读',
        'detail.strategy': '调度策略',
        'detail.usage': '本周期用量',
        'detail.warnings': '诊断告警数',
        'detail.none': '暂无条目',
        'kpi.tokens': 'Tokens',
        'kpi.tokensHint': '本周期经过插件的 token 用量',
        'kpi.requests': 'API 请求次数',
        'kpi.requestsHint': '本周期真实调用次数',
        'kpi.balance': '余额合计',
        'kpi.balanceHint': '各供应商官方余额之和',
        'kpi.activeDays': '活跃天数',
        'kpi.activeDaysHint': '本周期有调用的天数',
        'kpi.cost': '消费（估算）',
        'kpi.costHint': '按官方价格快照 × 真实用量估算',
        'fx.rate': '官方价目表为 USD，按汇率换算为人民币：',
        'peak': '高峰时段',
        'offpeak': '空闲时段',
        'switchIn': '切换倒计时',
        'sessions': '会话用量',
        'rotation.label': '模型轮转',
        'rotation.on': '已开启',
        'rotation.off': '已关闭',
        'rotation.current': '当前',
        'rotation.plan': '计划',
        'rotation.step': '立即切换下一个',
        'rotation.noRoutes': '未发现可调用的模型路由',
        'col.name': '名称',
        'col.requests': '请求',
        'col.tokens': 'Token',
        'col.actual': '实际',
        'col.standard': '标准',
        'dist.models': '模型分布',
        'dist.endpoints': '端点分布',
        'metric.tokens': '按 Token',
        'metric.cost': '按实际消费',
        'trendTitle': 'Token 使用趋势',
        'legend.input': 'Input',
        'legend.output': 'Output',
        'legend.cacheRead': 'Cache Read',
        'legend.cacheHitRate': 'Cache Hit Rate',
        'calendar': '每周 Token 热力',
        'calendarHint': '按 ISO 周聚合（近 6 个月）',
        'trend': '小时趋势',
        'avg': '均值',
        'syncedAt': '同步于',
        'syncModels': '同步模型',
        'usageWindow': '本周期',
        'unitRequests': '次请求',
        'resetsIn': '重置倒计时',
        'plan.payg': '套餐：按量计费',
        'plan.subscription': '套餐：订阅',
        'planLeft': '剩余',
        'reset': '重置',
        'live': '0s 实时',
        'cooldownLeft': '冷却剩余',
        'alerts': '预警',
        'warnings': '诊断 warnings',
        'deleteConfirm': '确认删除该提供商？凭据将从池目录中移除。',
        'addTitle': '添加模型提供商',
        'editTitle': '编辑提供商',
        'oauthHint': '将在新标签页打开授权页；回调地址必须与下方一致。',
        'oauthStart': '开始 OAuth 授权',
        'oauthRedirect': '回调地址',
        'discoveryHint': '自动扫描只列出候选，绝不静默导入；重复凭据会被标记。',
        'discoveryEmpty': '未发现本机凭据。',
        'duplicate': '已在池中',
      },
      en: {
        'section.label': 'Quota Nexus',
        'title': 'Model providers and quota',
        'subtitle': 'Scheduling strategy, connectivity, quota and cooldown countdown (0s sync)',
        'add': '+ Add model provider',
        'edit': 'Edit',
        'delete': 'Delete',
        'probe': 'Check',
        'cancel': 'Cancel',
        'save': 'Save and verify',
        'scan': 'Scan this machine',
        'import': 'Import',
        'empty': 'No provider yet. Click “+ Add model provider”.',
        'loading': 'Loading…',
        'loadFailed': 'Failed to read status',
        'detail': 'Details',
        'strategy': 'Scheduling strategy',
        'strategy.priority': 'priority (drain one account first)',
        'strategy.round-robin': 'round-robin',
        'strategy.balanced': 'balanced (favour longest idle)',
        'strategy.sticky': 'sticky (pin per session)',
        'tab.apikey': 'API Key',
        'tab.oauth': 'OAuth (PKCE)',
        'tab.discovery': 'Local discovery',
        'field.vendor': 'Provider',
        'field.label': 'Display name',
        'field.baseUrl': 'Base URL (OpenAI compatible)',
        'field.baseUrl.anthropic': 'Base URL (Anthropic Messages)',
        'field.baseUrl.both': 'Base URL (OpenAI compatible / Anthropic Messages)',
        'field.protocol': 'Wire protocol (selects the auth header)',
        'field.balanceUrl': 'Balance endpoint URL (optional; official endpoint when empty)',
        'field.balanceUrl.placeholder': 'e.g. https://api.deepseek.com/user/balance',
        'field.plan': 'Plan type (subscription counts usage per period)',
        'field.planLimit': 'Limit per period',
        'field.plan5h': '5h limit (optional, mirrors the console 5h window)',
        'period.day': 'resets daily',
        'period.week': 'resets weekly',
        'period.month': 'resets monthly',
        'protocol.auto': 'Auto (inferred from vendor and baseUrl)',
        'proto.openai': 'OpenAI compatible: authorization: Bearer <key> · endpoint ends at …/v1',
        'proto.anthropic': 'Anthropic Messages: x-api-key + anthropic-version 2023-06-01 · endpoint ends at …/v1',
        'discoveryIdle': 'Not scanned yet. “Scan this machine” only lists credential candidates from env vars and client snapshots; nothing is imported automatically.',
        'field.apiKey': 'API Key',
        'field.validate': 'Verify connectivity before saving',
        'hint.anthropic':
          'Anthropic Messages protocol: auth is x-api-key plus anthropic-version: 2023-06-01. Point baseUrl at a /v1 root (official: https://api.anthropic.com/v1; a relay: its own /v1 address).',
        'status.connected': 'Connected',
        'status.error': 'Error',
        'status.unavailable': 'Unavailable',
        'status.unknown': 'Unknown',
        'status.disabled': 'Disabled',
        'status.needs_relogin': 'Re-login required',
        'status.rate_limited': 'Rate limited',
        'status.cooldown': 'Cooling down',
        'status.quota_low': 'Quota low',
        'status.unconfigured': 'Unconfigured',
        'quotaLeft': 'Quota left',
        'balance': 'Balance',
        'recharge': 'Top up →',
        'usage': 'Usage details',
        'models': 'Models',
        'modelsNone': 'Model catalog not synced yet',
        'autoSwitch': 'Auto-route',
        'planTotal': 'total',
        'used': 'used',
        'later': ' later',
        'usageDetail': 'Subscription usage details',
        'range.day': 'Today',
        'range.week': 'Last 7 days',
        'range.month': 'Last 30 days',
        'total': 'total',
        'peak': 'peak day',
        'activeDays': 'active days',
        'noUsage': 'No calls went through the plugin in this period (only real calls are counted)',
        'chipHint': 'Click for details',
        'close': 'Collapse',
        'detail.live': '0s live state',
        'detail.providers': 'Provider details',
        'detail.rotate': 'Model rotation plan',
        'detail.active': 'Active accounts',
        'detail.cooldown': 'Cooling accounts',
        'detail.relogin': 'Needs re-login',
        'detail.ledger': 'Write-behind queue',
        'detail.snapshot': 'Last snapshot',
        'detail.pool': 'Pool directory',
        'detail.writable': 'writable',
        'detail.readonly': 'read-only',
        'detail.strategy': 'Scheduling strategy',
        'detail.usage': 'Usage this period',
        'detail.warnings': 'Diagnostic warnings',
        'detail.none': 'Nothing to show',
        'kpi.tokens': 'Tokens',
        'kpi.tokensHint': 'tokens used through the plugin this period',
        'kpi.requests': 'API requests',
        'kpi.requestsHint': 'real calls this period',
        'kpi.balance': 'Total balance',
        'kpi.balanceHint': 'sum of official vendor balances',
        'kpi.activeDays': 'Active days',
        'kpi.activeDaysHint': 'days with at least one call',
        'kpi.cost': 'Cost (est.)',
        'kpi.costHint': 'official price snapshot × real usage',
        'fx.rate': 'Official prices are USD, converted at:',
        'peak': 'Peak hours',
        'offpeak': 'Off-peak',
        'switchIn': 'changes in',
        'sessions': 'Sessions',
        'rotation.label': 'Model rotation',
        'rotation.on': 'On',
        'rotation.off': 'Off',
        'rotation.current': 'current',
        'rotation.plan': 'plan',
        'rotation.step': 'Switch to next now',
        'rotation.noRoutes': 'No callable model route found',
        'col.name': 'Name',
        'col.requests': 'Req',
        'col.tokens': 'Token',
        'col.actual': 'Actual',
        'col.standard': 'Standard',
        'dist.models': 'Model distribution',
        'dist.endpoints': 'Endpoint distribution',
        'metric.tokens': 'By token',
        'metric.cost': 'By actual cost',
        'trendTitle': 'Token usage trend',
        'legend.input': 'Input',
        'legend.output': 'Output',
        'legend.cacheRead': 'Cache read',
        'legend.cacheHitRate': 'Cache hit rate',
        'calendar': 'Weekly token heat',
        'calendarHint': 'grouped by ISO week (last 6 months)',
        'trend': 'Hourly trend',
        'avg': 'avg',
        'syncedAt': 'synced',
        'syncModels': 'Sync models',
        'usageWindow': 'This window',
        'unitRequests': 'requests',
        'resetsIn': 'resets in',
        'plan.payg': 'Plan: pay-as-you-go',
        'plan.subscription': 'Plan: subscription',
        'planLeft': 'left',
        'reset': 'resets',
        'live': '0s live',
        'cooldownLeft': 'Cooldown',
        'alerts': 'Alerts',
        'warnings': 'Diagnostic warnings',
        'deleteConfirm': 'Delete this provider? Its credential is removed from the pool directory.',
        'addTitle': 'Add model provider',
        'editTitle': 'Edit provider',
        'oauthHint': 'The authorization page opens in a new tab; the redirect URI must match the value below.',
        'oauthStart': 'Start OAuth authorization',
        'oauthRedirect': 'Redirect URI',
        'discoveryHint': 'Scanning only lists candidates; nothing is imported silently. Duplicates are flagged.',
        'discoveryEmpty': 'No local credential found.',
        'duplicate': 'Already in pool',
      },
    }

    const VENDORS = [
      { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
      { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
      { id: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
      { id: 'gemini', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
      { id: 'minimax-cn', label: 'MiniMax（国内）', baseUrl: 'https://api.minimaxi.com/v1' },
      { id: 'moonshot-cn', label: 'Moonshot（国内）', baseUrl: 'https://api.moonshot.cn/v1' },
      { id: 'zhipu-cn', label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
      { id: 'qwen-cn', label: '通义千问（兼容模式）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
      { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
      { id: 'ollama', label: 'Ollama（本机 127.0.0.1:11434）', baseUrl: 'http://127.0.0.1:11434/v1' },
      { id: 'custom', label: '自定义 OpenAI 兼容服务', baseUrl: '' },
      { id: 'custom-anthropic', label: '自定义 Anthropic 协议服务（Messages）', baseUrl: '' },
    ]

    /** 供应商 → 协议族：决定鉴权头与提示文案。 */
    const PROTOCOL = {
      anthropic: 'anthropic-messages',
      'custom-anthropic': 'anthropic-messages',
      gemini: 'gemini',
    }

    const STATUS_COLOR = {
      connected: 'var(--dsw-alias-state-success-primary)',
      unknown: 'var(--dsw-alias-state-idle-primary)',
      unconfigured: 'var(--dsw-alias-state-idle-primary)',
      disabled: 'var(--dsw-alias-state-idle-primary)',
      unavailable: 'var(--dsw-alias-state-idle-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
      needs_relogin: 'var(--dsw-alias-state-error-primary)',
      rate_limited: 'var(--dsw-alias-state-warn-primary)',
      cooldown: 'var(--dsw-alias-state-warn-primary)',
      quota_low: 'var(--dsw-alias-state-warn-primary)',
    }

    const style = {
      section: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
      },
      header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
      title: { fontSize: 15, fontWeight: 600, margin: 0 },
      subtitle: { margin: '4px 0 0', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
      chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
      chip: {
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-2)',
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 12,
        color: 'var(--dsw-alias-label-secondary)',
      },
      list: { display: 'flex', flexDirection: 'column', gap: 8 },
      card: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        rowGap: 8,
        padding: '10px 12px',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-1)',
        boxSizing: 'border-box',
        minWidth: 0,
        overflow: 'hidden',
      },
      dot: { width: 8, height: 8, borderRadius: 999, flex: '0 0 auto' },
      main: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
      rowTitle: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
      name: { fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      meta: {
        fontSize: 11,
        color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        lineHeight: 1.55,
        minWidth: 0,
      },
      bar: { height: 4, borderRadius: 999, background: 'var(--dsw-alias-bg-layer-2)', overflow: 'hidden' },
      barFill: { height: '100%', borderRadius: 999, background: 'var(--dsw-alias-brand-primary)', transition: 'width 240ms ease' },
      button: {
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 12,
        cursor: 'pointer',
      },
      /** 卡片操作区的小号按钮：放得下 4 个且不挤占正文。 */
      buttonSmall: {
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: 7,
        padding: '3px 8px',
        fontSize: 11,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      },
      buttonSmallDanger: {
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'transparent',
        color: 'var(--dsw-alias-state-error-primary)',
        borderRadius: 7,
        padding: '3px 8px',
        fontSize: 11,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      },
      primary: {
        border: '1px solid var(--dsw-alias-brand-primary)',
        background: 'var(--dsw-alias-brand-primary)',
        color: 'var(--dsw-alias-bg-base)',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 12,
        cursor: 'pointer',
      },
      danger: {
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'transparent',
        color: 'var(--dsw-alias-state-error-primary)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 12,
        cursor: 'pointer',
      },
      addRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        padding: '10px 12px',
        border: '1px dashed var(--dsw-alias-border-l2)',
        borderRadius: 10,
        background: 'transparent',
        color: 'var(--dsw-alias-brand-primary)',
        fontSize: 12,
        cursor: 'pointer',
      },
      overlay: {
        position: 'fixed',
        inset: 0,
        background: 'color-mix(in srgb, var(--dsw-alias-bg-base) 72%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 24,
      },
      dialog: {
        width: 520,
        maxWidth: '92vw',
        maxHeight: '86vh',
        overflow: 'auto',
        background: 'var(--dsw-alias-bg-overlay)',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      },
      field: { display: 'flex', flexDirection: 'column', gap: 4 },
      label: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
      input: {
        background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 8,
        padding: '6px 8px',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 12,
        width: '100%',
        boxSizing: 'border-box',
      },
      tabs: { display: 'flex', gap: 6, borderBottom: '1px solid var(--dsw-alias-border-l1)', paddingBottom: 8 },
      tab: {
        border: '1px solid transparent',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 12,
        cursor: 'pointer',
      },
      tabActive: {
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 12,
        cursor: 'pointer',
      },
      note: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.6 },
      errorText: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)', whiteSpace: 'pre-wrap' },
      alert: {
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
      },
    }

    const api = async (path, options = {}) => {
      const init = { method: options.method ?? 'GET', headers: {} }
      if (options.body !== undefined) {
        init.headers['content-type'] = 'application/json'
        init.body = JSON.stringify(options.body)
      }
      let response
      try {
        response = await fetch(`${BASE}${path}`, init)
      } catch (error) {
        return { ok: false, code: 'quota_nexus_network', message: String(error?.message ?? error) }
      }
      let payload
      try {
        payload = await response.json()
      } catch {
        return { ok: false, code: 'quota_nexus_bad_response', message: `HTTP ${response.status}` }
      }
      if (!response.ok && payload && payload.ok === undefined) payload.ok = false
      return payload
    }

    /** 趋势图按模型分色（对齐控制台的红/黄/灰序列）。 */
    const SERIES_COLORS = ['#f0453f', '#f5b942', '#5a5a5a', '#247bbf', '#6aa84f', '#9b59b6']

    const pct = (ratio) => (typeof ratio === 'number' ? Math.round(ratio * 1000) / 10 : null)

    /** 人类可读的倒计时：4 天 15 小时 / 4 小时 59 分 / 3 分 12 秒。 */
    const fmtDuration = (ms) => {
      const total = Math.max(0, Math.round(ms / 1000))
      const day = Math.floor(total / 86400)
      const hour = Math.floor((total % 86400) / 3600)
      const minute = Math.floor((total % 3600) / 60)
      const second = total % 60
      if (day > 0) return `${day} 天 ${hour} 小时`
      if (hour > 0) return `${hour} 小时 ${minute} 分`
      if (minute > 0) return `${minute} 分 ${second} 秒`
      return `${second} 秒`
    }

    const StatusDot = ({ status }) =>
      h('span', {
        style: { ...style.dot, background: STATUS_COLOR[status] ?? STATUS_COLOR.unknown },
        title: status,
        'aria-label': status,
      })

    const QuotaBar = ({ ratio }) => {
      const p = ratio === null || ratio === undefined ? null : Math.max(0, Math.min(1, ratio))
      return h(
        'div',
        { style: style.bar, title: p === null ? '' : `${pct(p)}%` },
        h('div', { style: { ...style.barFill, width: `${p === null ? 0 : p * 100}%` } }),
      )
    }

    const ProviderCard = ({ provider, t, now, onEdit, onDelete, onProbe, onSyncModels }) => {
      // 官方没给额度头时不再占用卡片版面：无数据就不渲染额度条与提示（诊断信息仍可在头部胶囊里查看）。
      const hasQuota = typeof provider.quotaRatio === 'number'
      const quotaText = hasQuota ? `${t('quotaLeft')} ${pct(provider.quotaRatio)}%` : ''
      const observed = hasQuota && provider.quotaObservedAt
        ? ` · ${new Date(provider.quotaObservedAt).toLocaleTimeString()}`
        : ''
      const cooldown =
        provider.cooldownMs > 0 ? ` · ${t('cooldownLeft')} ${Math.ceil(provider.cooldownMs / 1000)}s` : ''
      const modelsText = provider.modelsCount
        ? `${t('models')} ${provider.modelsCount} · ${(provider.modelsPreview ?? []).slice(0, 3).join(', ')}${
            provider.modelsSyncedAt ? ` · ${t('syncedAt')} ${new Date(provider.modelsSyncedAt).toLocaleTimeString()}` : ''
          }`
        : t('modelsNone')
      const autoEntries = Object.entries(provider.autoModels ?? {})
      const autoText = autoEntries.length
        ? `${t('autoSwitch')} ${autoEntries
            .slice(0, 3)
            .map(([task, model]) => `${task}→${model}`)
            .join(' · ')}`
        : ''
      const usage = provider.usage
      const usageText = usage
        ? `${t('usageWindow')} ${usage.requests} ${t('unitRequests')}${usage.tokens ? ` · ${usage.tokens} tokens` : ''}${
            usage.resetsInMs > 0 ? ` · ${t('resetsIn')} ${Math.ceil(usage.resetsInMs / 1000)}s` : ''
          }`
        : ''
      const plan = provider.plan
      const planRemainMs =
        plan && plan.resetsAt ? Math.max(0, new Date(plan.resetsAt).getTime() - now) : plan?.resetsInMs ?? 0
      const planText = plan
        ? plan.kind === 'subscription'
          ? `${t('plan.subscription')} · ${plan.used ?? 0}/${plan.limit ?? '∞'} ${
              plan.unit === 'tokens' ? 'tokens' : t('unitRequests')
            }${plan.limit !== null && plan.remaining !== null ? ` · ${t('planLeft')} ${plan.remaining}` : ''}${
              plan.resetsAt ? ` · ${t('reset')} ${Math.ceil(planRemainMs / 1000)}s` : ''
            }`
          : t('plan.payg')
        : ''
      const planWindows = plan?.windows ?? []
      const windowsBlock = planWindows.length
        ? h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 } },
            ...planWindows.map((window) =>
              h(
                'div',
                { key: window.id, style: { display: 'flex', flexDirection: 'column', gap: 3 } },
                h(
                  'div',
                  { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, gap: 8 } },
                  h('span', { style: { color: 'var(--dsw-alias-label-primary)' } }, `${window.id} 限额`),
                  h(
                    'span',
                    { style: { color: 'var(--dsw-alias-label-secondary)' } },
                    `${t('planTotal')} ${window.limit ?? '∞'}${window.usedPct === null ? '' : ` · ${t('used')} ${window.usedPct}%`}${
                      window.resetsAt
                        ? ` · ${fmtDuration(new Date(window.resetsAt).getTime() - now)}${t('later')}${t('reset')}`
                        : ''
                    }`,
                  ),
                ),
                h(QuotaBar, { ratio: window.usedPct === null ? null : 1 - window.usedPct / 100 }),
              ),
            ),
          )
        : null
      return h(
        'div',
        { style: style.card, 'data-quota-nexus': provider.id },
        h(StatusDot, { status: provider.status }),
        h(
          'div',
          { style: style.main },
          h(
            'div',
            { style: style.rowTitle },
            h('span', { style: style.name }, provider.label ?? provider.vendorId),
            h('span', { style: { ...style.meta, flex: '0 0 auto' } }, t(`status.${provider.status}`)),
          ),
          h(
            'div',
            { style: style.meta },
            `${provider.credential?.masked || '—'} · ${provider.kind || 'openai-compatible'}${provider.protocolSource === 'inferred' ? ' (auto)' : ''} · ${provider.baseUrl || '—'}${cooldown}`,
          ),
          hasQuota ? h(QuotaBar, { ratio: provider.quotaRatio }) : null,
          hasQuota ? h('div', { style: style.meta }, `${quotaText}${observed}`) : null,
          usageText ? h('div', { style: style.meta }, usageText) : null,
          planText ? h('div', { style: { ...style.meta, fontWeight: 600 } }, planText) : null,
          windowsBlock,
          h('div', { style: style.meta }, modelsText),
          autoText ? h('div', { style: { ...style.meta, color: 'var(--dsw-alias-brand-primary)' } }, autoText) : null,
          provider.billing
            ? h(
                'div',
                {
                  style: {
                    ...style.meta,
                    color:
                      provider.billing.phase === 'peak'
                        ? 'var(--dsw-alias-state-warn-primary)'
                        : 'var(--dsw-alias-state-success-primary)',
                  },
                  title: provider.billing.note ?? '',
                },
                `${provider.billing.phase === 'peak' ? '●' : '○'} ${
                  provider.billing.phase === 'peak' ? t('peak') : t('offpeak')
                }${
                  provider.billing.nextChangeAt
                    ? ` · ${t('switchIn')} ${fmtDuration(new Date(provider.billing.nextChangeAt).getTime() - now)}`
                    : ''
                }`,
              )
            : null,
          provider.balance?.amount !== null && provider.balance?.amount !== undefined
            ? h(
                'div',
                { style: { ...style.meta, fontWeight: 600 } },
                `${t('balance')} ${provider.balance.currency ?? ''} ${provider.balance.amount}${
                  provider.balance.observedAt ? ` · ${new Date(provider.balance.observedAt).toLocaleTimeString()}` : ''
                }${provider.balance.available === false ? ' · 不可用' : ''}`,
              )
            : null,
          provider.rechargeUrl || provider.usageUrl
            ? h(
                'div',
                { style: { display: 'flex', gap: 12, fontSize: 11, flexWrap: 'wrap' } },
                provider.rechargeUrl
                  ? h(
                      'a',
                      {
                        href: provider.rechargeUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        style: { color: 'var(--dsw-alias-brand-primary)', textDecoration: 'underline' },
                      },
                      t('recharge'),
                    )
                  : null,
                provider.usageUrl
                  ? h(
                      'a',
                      {
                        href: provider.usageUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        style: { color: 'var(--dsw-alias-label-secondary)', textDecoration: 'underline' },
                      },
                      t('usage'),
                    )
                  : null,
              )
            : null,
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              gap: 4,
              flex: '0 1 auto',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              marginLeft: 'auto',
              minWidth: 0,
            },
          },
          h('button', { type: 'button', style: style.buttonSmall, onClick: () => onSyncModels(provider) }, t('syncModels')),
          h('button', { type: 'button', style: style.buttonSmall, onClick: () => onProbe(provider) }, t('probe')),
          h('button', { type: 'button', style: style.buttonSmall, onClick: () => onEdit(provider) }, t('edit')),
          h('button', { type: 'button', style: style.buttonSmallDanger, onClick: () => onDelete(provider) }, t('delete')),
        ),
      )
    }

    /** 图表配色（高对比序列，暗色主题下可读）。 */
    const CHART_COLORS = ['#3fb6a8', '#f0b429', '#7aa7ff', '#e2708f', '#9b8cff', '#5cc27d', '#e08a4f', '#8b95a7']

    const fmtMoney = (value) => '\u00A5' + (Number(value) || 0).toFixed(4)

    const fmtTokensShort = (value) => {
      const n = Number(value) || 0
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
      return String(n)
    }

    /** 环形图：按占比切分。 */
    function DonutChart({ items, total, centerLabel, unit }) {
      const radius = 42
      const circumference = 2 * Math.PI * radius
      const sum = total || items.reduce((acc, item) => acc + item.value, 0)
      const rawLabel = String(centerLabel ?? '')
      const label = rawLabel.length > 7 ? rawLabel.slice(0, 7) + '…' : rawLabel
      let offset = 0
      const segments = items.map((item, index) => {
        const share = sum ? item.value / sum : 0
        const dash = share * circumference
        const segment = h('circle', {
          key: index,
          cx: 60,
          cy: 60,
          r: radius,
          fill: 'none',
          stroke: CHART_COLORS[index % CHART_COLORS.length],
          strokeWidth: 17,
          strokeDasharray: dash + ' ' + (circumference - dash),
          strokeDashoffset: -offset,
          transform: 'rotate(-90 60 60)',
        })
        offset += dash
        return segment
      })
      return h(
        'svg',
        { viewBox: '0 0 120 120', width: 128, height: 128, role: 'img', 'aria-label': centerLabel, style: { flex: '0 0 auto' } },
        h('circle', { cx: 60, cy: 60, r: radius, fill: 'none', stroke: 'var(--dsw-alias-bg-layer-2)', strokeWidth: 17 }),
        ...segments,
        h('text', { x: 60, y: 56, textAnchor: 'middle', fontSize: 8.5, fill: 'var(--dsw-alias-label-secondary)' }, label),
        h('text', { x: 60, y: 74, textAnchor: 'middle', fontSize: 12, fontWeight: 700, fill: 'var(--dsw-alias-label-primary)' }, unit),
      )
    }

    /** 分布卡：环形图 + 明细表（请求 / Token / 实际 / 标准）。 */
    function DistributionCard({ title, items, metric, t }) {
      const valueOf = (item) => (metric === 'cost' ? item.costCny ?? item.costUsd : item.tokens)
      const rows = items.slice(0, 6)
      const total = items.reduce((acc, item) => acc + valueOf(item), 0)
      const centerUnit = metric === 'cost' ? fmtMoney(total) : fmtTokensShort(total)
      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: 10,
            background: 'var(--dsw-alias-bg-layer-1)',
            padding: '10px 12px',
            minWidth: 0,
          },
        },
        h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, title),
        h(
          'div',
          { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
          h(DonutChart, { items: items.map((item) => ({ value: valueOf(item) })), total, centerLabel: t('dist.total'), unit: centerUnit }),
          h(
            'div',
            { style: { flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 } },
            h(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.7fr) 44px 60px 64px 64px',
                  gap: 4,
                  color: 'var(--dsw-alias-label-secondary)',
                },
              },
              h('span', null, t('col.name')),
              h('span', null, t('col.requests')),
              h('span', null, t('col.tokens')),
              h('span', null, t('col.actual')),
              h('span', null, t('col.standard')),
            ),
            ...(rows.length
              ? rows.map((item, index) =>
              h(
                'div',
                {
                  key: index,
                  style: {
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1.7fr) 44px 60px 64px 64px',
                    gap: 4,
                    alignItems: 'center',
                  },
                },
                h(
                  'span',
                  { style: { display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 } },
                  h('span', {
                    style: {
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      background: CHART_COLORS[index % CHART_COLORS.length],
                      flex: '0 0 auto',
                    },
                  }),
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.name),
                ),
                h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, String(item.requests)),
                h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, fmtTokensShort(item.tokens)),
                h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, fmtMoney(item.costCny ?? item.costUsd)),
                h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, fmtMoney(item.listCostCny ?? item.listCostUsd)),
              ),
                )
              : [h('div', { key: 'empty', style: { color: 'var(--dsw-alias-label-secondary)' } }, t('detail.none'))]),
          ),
        ),
      )
    }

    /** Token 使用趋势：Input / Output / Cache Read 折线 + 缓存命中率（右轴）。 */
    function TrendCard({ row, t }) {
      const buckets = row.buckets ?? []
      const width = 640
      const height = 170
      const pad = 26
      const maxTokens = Math.max(
        1,
        ...buckets.map((bucket) => Math.max(bucket.input || 0, bucket.output || 0, bucket.cached || 0)),
      )
      const x = (index) => pad + (index * (width - pad * 2)) / Math.max(1, buckets.length - 1)
      const y = (value) => height - pad - (value / maxTokens) * (height - pad * 2)
      const yRate = (rate) => height - pad - rate * (height - pad * 2)
      const path = (get) =>
        buckets.map((bucket, index) => (index === 0 ? 'M' : 'L') + x(index) + ',' + y(get(bucket))).join(' ')
      const ratePoints = buckets
        .map((bucket, index) => {
          const denom = (bucket.input || 0) + (bucket.cached || 0)
          if (!denom) return null
          return [index, bucket.cached / denom]
        })
        .filter(Boolean)
      const rateLine = ratePoints.map((point, index) => (index === 0 ? 'M' : 'L') + x(point[0]) + ',' + yRate(point[1])).join(' ')
      const series = [
        { key: 'input', label: t('legend.input'), color: '#3fb6a8', get: (bucket) => bucket.input || 0 },
        { key: 'output', label: t('legend.output'), color: '#f0b429', get: (bucket) => bucket.output || 0 },
        { key: 'cached', label: t('legend.cacheRead'), color: '#7aa7ff', get: (bucket) => bucket.cached || 0 },
      ]
      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: 10,
            background: 'var(--dsw-alias-bg-layer-1)',
            padding: '10px 12px',
            minWidth: 0,
          },
        },
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
          h(
            'span',
            { style: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } },
            t('trendTitle') + ' · ' + row.label,
          ),
          h(
            'span',
            { style: { display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)' } },
            ...series.map((item) =>
              h(
                'span',
                { key: item.key, style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
                h('span', { style: { width: 8, height: 8, borderRadius: 2, background: item.color } }),
                item.label,
              ),
            ),
            h(
              'span',
              { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
              h('span', { style: { width: 9, height: 2, background: '#c58bff' } }),
              t('legend.cacheHitRate') +
                (typeof row.totals.cacheHitRate === 'number' ? ' ' + row.totals.cacheHitRate + '%' : ''),
            ),
          ),
        ),
        h(
          'svg',
          { viewBox: '0 0 ' + width + ' ' + height, width: '100%', height: 170, preserveAspectRatio: 'none' },
          ...series.map((item) =>
            h('path', { key: item.key, d: path(item.get), fill: 'none', stroke: item.color, strokeWidth: 1.8, strokeLinejoin: 'round' }),
          ),
          rateLine
            ? h('path', { d: rateLine, fill: 'none', stroke: '#c58bff', strokeWidth: 1.4, strokeDasharray: '4 3' })
            : null,
        ),
        h(
          'div',
          { style: { ...style.meta, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
          h('span', null, t('total') + ' ' + row.totals.tokensText + ' tokens'),
          h('span', null, t('kpi.cost') + ' ' + fmtMoney(row.totals.costCny ?? row.totals.costUsd)),
        ),
      )
    }

    function QuotaNexusSection() {
      const [snapshot, setSnapshot] = useState(null)
      const [error, setError] = useState(null)
      const [busy, setBusy] = useState(false)
      const [dialog, setDialog] = useState(null)
      const [nowWall, setNowWall] = useState(() => Date.now())
      const [openChip, setOpenChip] = useState(null)
      const [usageRange, setUsageRange] = useState('day')
      const [usage, setUsage] = useState(null)
      const [calendar, setCalendar] = useState(null)
      const [distMetric, setDistMetric] = useState('tokens')
      const [rotation, setRotation] = useState(null)

      useEffect(() => {
        void api('/api/rotation')
          .then((payload) => {
            if (payload?.ok) setRotation(payload)
          })
          .catch(() => {})
      }, [snapshot?.generatedAt])

      useEffect(() => {
        void api(`/api/usage?range=${usageRange}`)
          .then((payload) => {
            if (payload?.ok) setUsage(payload)
          })
          .catch(() => {})
      }, [usageRange, snapshot?.generatedAt])

      useEffect(() => {
        void api('/api/usage/calendar?months=6')
          .then((payload) => {
            if (payload?.ok) setCalendar(payload)
          })
          .catch(() => {})
      }, [snapshot?.generatedAt])

      // 本地 1s 心跳：倒计时（重置/冷却）逐秒走，不需要再打服务端 → 观感是 0s 实时。
      useEffect(() => {
        const timer = setInterval(() => setNowWall(Date.now()), 1000)
        return () => clearInterval(timer)
      }, [])

      const t = useCallback(
        (key) => {
          const translate = translateRef
          if (typeof translate === 'function') {
            try {
              const value = translate(key)
              if (typeof value === 'string' && value && value !== key) return value
            } catch {
              /* 词典未注册时回落 */
            }
          }
          const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en'
          const dict = lang.toLowerCase().startsWith('zh') ? DICT.zh : DICT.en
          return dict[key] ?? key
        },
        [],
      )

      const refresh = useCallback(async () => {
        const payload = await api('/api/overview')
        if (payload?.ok === false && payload?.code) {
          setError(payload)
          return
        }
        setSnapshot(payload)
        setError(null)
      }, [])

      useEffect(() => {
        void refresh()
        // 打开面板即触发一次服务端快刷（余额/套餐窗口），之后由 SSE 持续推送。
        void api('/api/providers/refresh', { method: 'POST' }).catch(() => {})
        let source
        try {
          source = new EventSource(`${BASE}/api/events`)
          source.addEventListener('snapshot', (event) => {
            try {
              const frame = JSON.parse(event.data)
              setSnapshot((current) =>
                current
                  ? { ...frame.payload, providers: current.providers, generatedAt: frame.at }
                  : frame.payload,
              )
            } catch {
              /* 忽略坏帧 */
            }
          })
          const onDelta = () => {
            void refresh()
          }
          source.addEventListener('quota', onDelta)
          source.addEventListener('health', onDelta)
          source.addEventListener('providers', onDelta)
          source.addEventListener('probe', onDelta)
          source.addEventListener('strategy', onDelta)
          source.addEventListener('alert', onDelta)
          source.addEventListener('balance', onDelta)
          source.addEventListener('plan', onDelta)
          source.addEventListener('models', onDelta)
        } catch {
          /* EventSource 不可用：退化为手动刷新 */
        }
        const poll = setInterval(() => void refresh(), 15_000)
        return () => {
          clearInterval(poll)
          try {
            source?.close()
          } catch {
            /* 已关闭 */
          }
        }
      }, [refresh])

      const setStrategy = useCallback(
        async (strategy) => {
          setBusy(true)
          await api('/api/strategy', { method: 'POST', body: { strategy } })
          await refresh()
          setBusy(false)
        },
        [refresh],
      )

      const probe = useCallback(
        async (provider) => {
          setBusy(true)
          await api('/api/providers/probe', { method: 'POST', body: { id: provider.id } })
          await refresh()
          setBusy(false)
        },
        [refresh],
      )

      const syncModelsFor = useCallback(
        async (provider) => {
          setBusy(true)
          await api('/api/providers/sync-models', { method: 'POST', body: { id: provider.id } })
          await refresh()
          setBusy(false)
        },
        [refresh],
      )

      const toggleRotation = useCallback(
        async (enabled) => {
          setBusy(true)
          const result = await api('/api/rotation', { method: 'POST', body: { enabled } })
          setBusy(false)
          if (result?.ok) setRotation((current) => ({ ...(current ?? {}), ...result }))
        },
        [],
      )

      const stepRotation = useCallback(async () => {
        setBusy(true)
        const result = await api('/api/rotation/step', { method: 'POST' })
        setBusy(false)
        if (result?.ok) {
          setRotation((current) => ({ ...(current ?? {}), current: result.to }))
        }
      }, [])

      const remove = useCallback(
        async (provider) => {
          if (typeof window !== 'undefined' && !window.confirm(`${t('deleteConfirm')}\n${provider.label}`)) return
          setBusy(true)
          await api('/api/providers/delete', { method: 'POST', body: { id: provider.id } })
          await refresh()
          setBusy(false)
        },
        [refresh, t],
      )

      const providers = snapshot?.providers ?? []
      const counts = snapshot?.counts ?? {}
      const accounts = snapshot?.accounts ?? []
      const alerts = (snapshot?.alerts ?? []).slice(0, 3)
      const warnings = snapshot?.warnings ?? []

      /** 头部统计胶囊：点击展开对应明细。 */
      const chipButton = (key, label, accent) =>
        h(
          'button',
          {
            key,
            type: 'button',
            'aria-expanded': openChip === key,
            title: t('chipHint'),
            style: {
              ...style.chip,
              cursor: 'pointer',
              fontFamily: 'inherit',
              ...(accent
                ? { color: 'var(--dsw-alias-state-success-primary)', borderColor: 'var(--dsw-alias-state-success-primary)' }
                : {}),
              ...(openChip === key
                ? { background: 'var(--dsw-alias-bg-layer-1)', borderColor: 'var(--dsw-alias-border-l2)' }
                : {}),
            },
            onClick: () => setOpenChip(openChip === key ? null : key),
          },
          label,
        )

      /** 当前展开的胶囊对应明细。 */
      const detailLines = () => {
        if (!openChip) return []
        const lines = []
        if (openChip === 'live') {
          lines.push(`${t('detail.snapshot')}: ${snapshot?.generatedAt ?? '-'}`)
          lines.push(`${t('detail.pool')}: ${snapshot?.pool?.path ?? '-'}（${snapshot?.pool?.writable ? t('detail.writable') : t('detail.readonly')}）`)
          lines.push(`${t('detail.strategy')}: ${snapshot?.strategy ?? '-'}（${t('rotateAmong').replace('{n}', String(providers.length))}）`)
          lines.push(`${t('detail.ledger')}: flushed ${snapshot?.ledger?.flushed ?? 0} · queued ${snapshot?.ledger?.queued ?? 0} · dropped ${snapshot?.ledger?.dropped ?? 0}`)
        } else if (openChip === 'providers') {
          for (const provider of providers) {
            lines.push(
              `${provider.label} · ${provider.vendorId} · ${provider.kind} · ${t(`status.${provider.status}`)}${
                provider.balance?.amount !== null && provider.balance?.amount !== undefined
                  ? ` · ${t('balance')} ${provider.balance.currency ?? ''} ${provider.balance.amount}`
                  : ''
              }`,
            )
          }
          if (!lines.length) lines.push(t('detail.none'))
        } else if (openChip === 'active' || openChip === 'cooldown' || openChip === 'relogin') {
          const wanted = openChip === 'active' ? 'active' : openChip === 'cooldown' ? 'cooldown' : 'relogin'
          for (const account of accounts) {
            const hit =
              wanted === 'active'
                ? account.state === 'active'
                : wanted === 'cooldown'
                  ? account.state === 'cooldown' || account.cooldownMs > 0
                  : account.needsRelogin
            if (!hit) continue
            lines.push(
              `${account.account} · ${t(`status.${account.health === 'connected' ? 'connected' : 'unknown'}`)}${
                account.cooldownMs > 0 ? ` · ${t('cooldownLeft')} ${Math.ceil(account.cooldownMs / 1000)}s` : ''
              }${account.needsRelogin ? ` · ${t('status.needs_relogin')}` : ''}`,
            )
          }
          if (!lines.length) lines.push(t('detail.none'))
        } else if (openChip === 'ledger') {
          lines.push(`${t('detail.ledger')}: queued ${snapshot?.ledger?.queued ?? 0} · flushed ${snapshot?.ledger?.flushed ?? 0} · dropped ${snapshot?.ledger?.dropped ?? 0}`)
          lines.push(`${t('detail.usage')}: ${usage ? usage.providers?.map((row) => `${row.label} ${row.totals.requests}`).join(' · ') || '-' : '-'}`)
          lines.push(`${t('detail.warnings')}: ${warnings.length}`)
        } else if (openChip === 'rotate') {
          for (const provider of providers) {
            const auto = provider.autoModels ?? {}
            const parts = Object.entries(auto).map(([task, model]) => `${task}→${model}`)
            lines.push(`${provider.label}: ${parts.length ? parts.join(' · ') : t('modelsNone')}`)
          }
        }
        return lines
      }

      const chipDetails = detailLines()
      const usageRows = usage?.providers ?? []
      const totalTokens = usageRows.reduce((sum, row) => sum + row.totals.tokens, 0)
      const totalRequests = usageRows.reduce((sum, row) => sum + row.totals.requests, 0)
      const activeDays = usageRows.reduce((best, row) => Math.max(best, row.totals.activeDays), 0)
      const balanceSum = providers.reduce(
        (sum, provider) => sum + (typeof provider.balance?.amount === 'number' ? provider.balance.amount : 0),
        0,
      )
      const balanceCurrencies = [...new Set(providers.map((provider) => provider.balance?.currency).filter(Boolean))]
      const balanceText = providers.length ? `${balanceCurrencies.join('/') || '—'} ${balanceSum.toFixed(2)}` : '—'
      const costCny = usageRows.reduce((sum, row) => sum + (Number(row.totals.costCny ?? row.totals.costUsd) || 0), 0)
      const costText = '\u00A5' + costCny.toFixed(4)
      const fxRate = Number(usage?.currency?.usdToCnyRate) || 0
      const fmtTokens = (value) =>
        value >= 1e9 ? (value / 1e9).toFixed(2) + 'B' : value >= 1e6 ? (value / 1e6).toFixed(2) + 'M' : value >= 1e3 ? (value / 1e3).toFixed(1) + 'K' : String(value)

      return h(
        'section',
        { style: style.section, 'data-plugin': 'dsh-quota-nexus' },
        h(
          'div',
          { style: style.header },
          h(
            'div',
            null,
            h(
              'h2',
              { style: { ...style.title, display: 'flex', alignItems: 'center', gap: 8 } },
              t('title'),
              h(
                'span',
                {
                  style: { fontSize: 10.5, fontWeight: 400, color: 'var(--dsw-alias-label-secondary)', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 999, padding: '0 8px' },
                },
                BUILD_TAG,
              ),
            ),
            h('p', { style: style.subtitle }, snapshot?.pool?.path ? `${t('subtitle')} · ${snapshot.pool.path}` : t('subtitle')),
          ),
          h(
            'label',
            { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 } },
            h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('strategy')),
            h(
              'select',
              {
                style: { ...style.input, width: 210 },
                value: snapshot?.strategy ?? 'balanced',
                disabled: busy,
                onChange: (event) => void setStrategy(event.target.value),
              },
              ...STRATEGIES.map((strategy) =>
                h('option', { key: strategy, value: strategy }, t(`strategy.${strategy}`)),
              ),
            ),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('rotation.label')),
          h(
            'button',
            {
              type: 'button',
              style: rotation?.enabled ? style.primary : style.buttonSmall,
              disabled: busy,
              onClick: () => void toggleRotation(!rotation?.enabled),
            },
            rotation?.enabled ? t('rotation.on') : t('rotation.off'),
          ),
          rotation?.current
            ? h('span', { style: style.meta }, t('rotation.current') + ' ' + rotation.current.provider + '/' + rotation.current.model)
            : null,
          rotation?.plan?.length
            ? h('span', { style: style.meta },
                t('rotation.plan') + ' ' +
                  rotation.plan
                    .map((entry) => {
                      const caps = entry.capabilities ?? {}
                      const tag = [
                        caps.reasoning ? 'R' : null,
                        caps.vision ? 'V' : null,
                        caps.contextWindow ? Math.round(caps.contextWindow / 1000) + 'K' : null,
                      ]
                        .filter(Boolean)
                        .join('·')
                      return entry.provider + '/' + entry.model + (tag ? ' (' + tag + ')' : '')
                    })
                    .join(' → '),
              )
            : h('span', { style: style.meta }, t('rotation.noRoutes')),
          h('button', { type: 'button', style: style.buttonSmall, disabled: busy, onClick: () => void stepRotation() }, t('rotation.step')),
        ),

        h(
          'div',
          { style: style.chips },
          chipButton('live', `● ${t('live')}`, true),
          chipButton('providers', `providers ${counts.providers ?? 0}`),
          providers.length > 1
            ? chipButton('rotate', t('rotateAmong').replace('{n}', String(providers.length)))
            : null,
          chipButton('active', `active ${counts.active ?? 0}`),
          chipButton('cooldown', `cooldown ${counts.cooling ?? 0}`),
          chipButton('relogin', `re-login ${counts.needsRelogin ?? 0}`),
          chipButton('ledger', `ledger ${snapshot?.ledger?.queued ?? 0}/${snapshot?.ledger?.flushed ?? 0}`),
        ),
        openChip
          ? h(
              'div',
              {
                style: {
                  border: '1px solid var(--dsw-alias-border-l1)',
                  borderRadius: 10,
                  background: 'var(--dsw-alias-bg-layer-1)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 11.5,
                  color: 'var(--dsw-alias-label-secondary)',
                },
              },
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
                h('strong', { style: { color: 'var(--dsw-alias-label-primary)' } }, t(`detail.${openChip}`)),
                h(
                  'button',
                  {
                    type: 'button',
                    style: { ...style.button, padding: '1px 8px' },
                    onClick: () => setOpenChip(null),
                  },
                  t('close'),
                ),
              ),
              ...chipDetails.map((line, index) => h('div', { key: index }, line)),
            )
          : null,
        error ? h('div', { style: style.errorText }, `${t('loadFailed')}: ${error.message ?? error.code}`) : null,
        h(
          'div',
          { style: style.list },
          ...(providers.length
            ? providers.map((provider) =>
                h(ProviderCard, {
                  key: provider.id,
                  provider,
                  t,
                  now: nowWall,
                  onEdit: (entry) => setDialog({ mode: 'edit', provider: entry }),
                  onDelete: remove,
                  onProbe: probe,
                  onSyncModels: syncModelsFor,
                }),
              )
            : [h('div', { key: 'empty', style: style.note }, snapshot ? t('empty') : t('loading'))]),
          h(
            'button',
            { type: 'button', style: style.addRow, onClick: () => setDialog({ mode: 'add' }) },
            t('add'),
          ),
        ),
        h(
          'div',
          { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 } },
          ...[t('kpi.tokens'), t('kpi.requests'), t('kpi.cost'), t('kpi.balance'), t('kpi.activeDays')].map((label, index) =>
            h(
              'div',
              {
                key: label,
                style: { border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
              },
              h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, label),
              h('div', { style: { fontSize: 18, fontWeight: 700 } }, [fmtTokens(totalTokens), String(totalRequests), costText, balanceText, String(activeDays)][index]),
              h('div', { style: style.meta }, [t('kpi.tokensHint'), t('kpi.requestsHint'), t('kpi.costHint'), t('kpi.balanceHint'), t('kpi.activeDaysHint')][index]),
              index === 2 && fxRate
                ? h('div', { style: { ...style.meta, marginTop: 2 } }, t('fx.rate') + ' 1 USD = ' + fxRate.toFixed(2) + ' CNY')
                : null,
            ),
          ),
        ),
        calendar && (calendar.providers ?? []).some((row) => row.totalTokens > 0)
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1)', padding: '10px 12px' } },
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between' } },
                h('strong', { style: { fontSize: 12 } }, t('calendar')),
                h('span', { style: style.meta }, t('calendarHint')),
              ),
              ...(calendar.providers ?? []).flatMap((row) =>
                row.months.map((month) =>
                  h(
                    'div',
                    { key: row.providerId + month.key, style: { display: 'flex', gap: 4, alignItems: 'center' } },
                    h('span', { style: { width: 56, fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)' } }, month.key.slice(2)),
                    ...month.weeks.map((week) => {
                      const ratio = row.maxTokens ? week.tokens / row.maxTokens : 0
                      return h('div', {
                        key: week.weekStart,
                        title: week.weekStart + ' · ' + week.tokens + ' tokens',
                        style: {
                          flex: '0 0 76px',
                          padding: '6px 2px',
                          textAlign: 'center',
                          borderRadius: 6,
                          fontSize: 10.5,
                          background: week.tokens ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) ' + Math.round(14 + ratio * 70) + '%, var(--dsw-alias-bg-layer-1))' : 'var(--dsw-alias-bg-layer-2)',
                          color: ratio > 0.55 ? 'var(--dsw-alias-bg-base)' : 'var(--dsw-alias-label-secondary)',
                        },
                      }, fmtTokens(week.tokens))
                    }),
                  ),
                ),
              ),
            )
          : null,
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 10 } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            h('div', { style: { ...style.label, fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, t('usageDetail')),
            h(
              'div',
              { style: { display: 'flex', gap: 6 } },
              ...['day', 'week', 'month'].map((range) =>
                h(
                  'button',
                  { key: range, type: 'button', style: range === usageRange ? style.tabActive : style.tab, onClick: () => setUsageRange(range) },
                  t(`range.${range}`),
                ),
              ),
            ),
          ),
          ...(usage?.providers ?? []).filter((row) => row.totals.requests > 0).map((row) => {
            const peak = Math.max(1, ...row.buckets.map((bucket) => bucket.tokens))
            return h(
              'div',
              {
                key: row.providerId,
                style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1)' },
              },
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
                h('span', { style: { fontWeight: 600 } }, row.label),
                h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, `${row.totals.tokensText} Token`),
              ),
              h('div', { style: style.meta }, `${t('total')} ${row.totals.requests} ${t('unitRequests')} · ${t('peak')} ${row.totals.peakDayText} · ${t('activeDays')} ${row.totals.activeDays}`),
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } },
                h('span', null, `${t('trend')} · ${row.totals.tokensText}`),
                h('span', null, `${t('avg')} ${row.totals.avgTokensText}`),
              ),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 64, marginTop: 2 } },
                ...row.buckets.map((bucket, index) =>
                  h(
                    'div',
                    {
                      key: index,
                      title: `${new Date(bucket.at).toLocaleString()} · ${bucket.requests} req · ${bucket.tokens} tok`,
                      style: { flex: '1 1 0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1 },
                    },
                    ...(row.series ?? []).map((seriesItem, seriesIndex) => {
                      const tokens = seriesItem.buckets?.[index] ?? 0
                      if (!tokens) return null
                      return h('div', {
                        key: seriesItem.model || seriesIndex,
                        style: {
                          height: `${(tokens / peak) * 100}%`,
                          background: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
                          borderRadius: 1,
                        },
                      })
                    }),
                  ),
                ),
              ),
              h(
                'div',
                { style: { display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 10.5, marginTop: 2 } },
                ...(row.series ?? []).map((seriesItem, seriesIndex) =>
                  h(
                    'span',
                    {
                      key: seriesItem.model || seriesIndex,
                      style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--dsw-alias-label-secondary)' },
                    },
                    h('span', { style: { width: 8, height: 8, borderRadius: 2, background: SERIES_COLORS[seriesIndex % SERIES_COLORS.length] } }),
                    `${seriesItem.model} ${fmtTokens(seriesItem.tokens)}`,
                  ),
                ),
              ),
              h(
                'div',
                { style: { ...style.meta, marginTop: 2 } },
                `${t('sessions')}: ${(row.sessions ?? []).slice(0, 3).map((entry) => entry.session + ' ' + fmtTokens(entry.tokens)).join(' · ') || t('detail.none')}`,
              ),
              ...(row.costByModel ?? []).slice(0, 3).map((entry) =>
                h('div', { key: 'cost-' + entry.model, style: style.meta }, `${entry.model} · \u00A5${(entry.costCny ?? entry.costUsd ?? 0).toFixed(4)}`),
              ),
              ...row.models.slice(0, 4).map((model) =>
                h('div', { key: model.model, style: style.meta }, `${model.model} · ${model.requests} ${t('unitRequests')} · ${model.tokens} tok`),
              ),
            )
          }),
          (usage?.providers ?? []).every((row) => row.totals.requests === 0)
            ? h('div', { style: style.note }, t('noUsage'))
            : null,
        ),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 12 } },
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
            h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, t('usageDetail')),
            h(
              'div',
              { style: { display: 'flex', gap: 6 } },
              ...['tokens', 'cost'].map((metric) =>
                h(
                  'button',
                  {
                    key: metric,
                    type: 'button',
                    style: metric === distMetric ? style.tabActive : style.tab,
                    onClick: () => setDistMetric(metric),
                  },
                  metric === 'cost' ? t('metric.cost') : t('metric.tokens'),
                ),
              ),
            ),
          ),
          (usage?.providers ?? []).length
            ? h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 } },
                ...(usage?.providers ?? []).flatMap((row) => [
                  h(DistributionCard, {
                    key: row.providerId + '-models',
                    title: row.label + ' · ' + t('dist.models'),
                    metric: distMetric,
                    t,
                    items: (row.costByModel ?? []).map((entry) => ({
                      name: entry.model,
                      requests: entry.requests || 0,
                      tokens: entry.tokens || 0,
                      costUsd: entry.costUsd || 0,
                      listCostUsd: entry.listCostUsd || 0,
                      costCny: entry.costCny ?? entry.costUsd ?? 0,
                      listCostCny: entry.listCostCny ?? entry.listCostUsd ?? 0,
                    })),
                  }),
                  (row.endpoints ?? []).length
                    ? h(DistributionCard, {
                        key: row.providerId + '-endpoints',
                        title: row.label + ' · ' + t('dist.endpoints'),
                        metric: distMetric,
                        t,
                        items: (row.endpoints ?? []).map((entry) => ({
                          name: entry.endpoint,
                          requests: entry.requests || 0,
                          tokens: entry.tokens || 0,
                          costUsd: entry.costUsd || 0,
                          listCostUsd: entry.listCostUsd || 0,
                          costCny: entry.costCny ?? entry.costUsd ?? 0,
                          listCostCny: entry.listCostCny ?? entry.listCostUsd ?? 0,
                        })),
                      })
                    : null,
                ]),
              )
            : h('div', { style: style.note }, t('noUsage')),
          ...(usage?.providers ?? []).map((row) =>
            h(TrendCard, { key: row.providerId + '-trend', row, t }),
          ),
        ),
        alerts.length
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('div', { style: style.label }, t('alerts')),
              ...alerts.map((alert) =>
                h(
                  'div',
                  {
                    key: alert.id,
                    style: {
                      ...style.alert,
                      borderColor:
                        alert.level === 'error'
                          ? 'var(--dsw-alias-state-error-primary)'
                          : 'var(--dsw-alias-state-warn-primary)',
                    },
                  },
                  `${alert.title} — ${alert.detail}`,
                ),
              ),
            )
          : null,
        warnings.length
          ? h(
              'details',
              { style: { ...style.note, borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 8 } },
              h('summary', { style: { cursor: 'pointer' } }, `${t('warnings')} (${warnings.length})`),
              ...warnings.slice(-6).map((warning, index) =>
                h('div', { key: `${warning.code}-${index}` }, `· ${warning.code}: ${warning.message}`),
              ),
            )
          : null,
        dialog
          ? h(ProviderDialog, {
              mode: dialog.mode,
              provider: dialog.provider,
              t,
              onClose: () => setDialog(null),
              onSaved: async () => {
                setDialog(null)
                await refresh()
              },
            })
          : null,
      )
    }

    function ProviderDialog({ mode, provider, t, onClose, onSaved }) {
      const [tab, setTab] = useState('apikey')
      const [vendorId, setVendorId] = useState(provider?.vendorId ?? 'deepseek')
      const [protocol, setProtocol] = useState(provider?.protocol ?? '')
      const [balanceUrl, setBalanceUrl] = useState(provider?.balanceUrl ?? '')
      const [planKind, setPlanKind] = useState(provider?.plan?.kind ?? 'payg')
      const [planLimit, setPlanLimit] = useState(provider?.plan?.limit ?? '')
      const [planPeriod, setPlanPeriod] = useState(
        provider?.plan?.periodMs === 604800000 ? 'week' : provider?.plan?.periodMs === 2592000000 ? 'month' : 'day',
      )
      const periodMs = planPeriod === 'week' ? 604800000 : planPeriod === 'month' ? 2592000000 : 86400000
      const [plan5hLimit, setPlan5hLimit] = useState(
        provider?.plan?.windows?.find((window) => window.id === '5h')?.limit ?? '',
      )
      const buildPlan = () => {
        const windows = []
        if (planKind === 'subscription') {
          const fiveHour = Number(plan5hLimit)
          if (Number.isFinite(fiveHour) && fiveHour > 0) {
            windows.push({ id: '5h', limitMs: 18000000, limit: fiveHour })
          }
          const main = Number(planLimit)
          if (Number.isFinite(main) && main > 0) {
            windows.push({ id: planPeriod === 'week' ? 'week' : planPeriod === 'month' ? 'month' : 'day', limitMs: periodMs, limit: main })
          }
        }
        return {
          kind: planKind,
          limit: Number(planLimit) || null,
          periodMs,
          unit: 'requests',
          ...(windows.length ? { windows } : {}),
        }
      }
      const [label, setLabel] = useState(provider?.label ?? '')
      const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? '')
      const [apiKey, setApiKey] = useState('')
      const [validate, setValidate] = useState(true)
      const [busy, setBusy] = useState(false)
      const [message, setMessage] = useState(null)
      const [candidates, setCandidates] = useState(null)
      const [oauth, setOauth] = useState(null)

      const submit = useCallback(async () => {
        setBusy(true)
        setMessage(null)
        const payload =
          mode === 'edit'
            ? {
                id: provider.id,
                label: label || provider.label,
                baseUrl,
                protocol: protocol || '',
                balanceUrl: balanceUrl || '',
                plan: buildPlan(),
                apiKey: apiKey || undefined,
              }
            : {
                vendorId,
                label: label || undefined,
                baseUrl: baseUrl || undefined,
                protocol: protocol || undefined,
                balanceUrl: balanceUrl || undefined,
                plan: buildPlan(),
                apiKey,
                validate,
              }
        const result = await api(mode === 'edit' ? '/api/providers/edit' : '/api/providers', {
          method: 'POST',
          body: payload,
        })
        setBusy(false)
        if (result?.ok) {
          await onSaved()
          return
        }
        setMessage({
          level: 'error',
          text: `${result?.code ?? 'error'}: ${result?.message ?? ''}${result?.httpStatus ? ` (HTTP ${result.httpStatus})` : ''}`,
        })
      }, [apiKey, baseUrl, label, mode, onSaved, provider, validate, vendorId])

      const scan = useCallback(async () => {
        setBusy(true)
        const result = await api('/api/discovery/scan', { method: 'POST' })
        setCandidates(result?.candidates ?? [])
        setBusy(false)
      }, [])

      const importCandidate = useCallback(
        async (candidateId) => {
          setBusy(true)
          const result = await api('/api/discovery/import', { method: 'POST', body: { candidateId } })
          setBusy(false)
          if (result?.ok) {
            await onSaved()
            return
          }
          setMessage({ level: 'error', text: `${result?.code ?? 'error'}: ${result?.message ?? ''}` })
        },
        [onSaved],
      )

      const startOAuth = useCallback(async () => {
        setBusy(true)
        const redirectUri =
          typeof window !== 'undefined' ? `${window.location.origin}${BASE}/oauth/callback` : undefined
        const result = await api('/api/oauth/begin', { method: 'POST', body: { vendorId, redirectUri } })
        setBusy(false)
        if (!result?.ok) {
          setOauth({ ok: false, text: `${result?.code ?? 'error'}: ${result?.message ?? ''}` })
          return
        }
        setOauth({ ok: true, url: result.authorizeUrl, redirectUri: result.redirectUri ?? redirectUri })
        try {
          window.open(result.authorizeUrl, '_blank', 'noopener,noreferrer')
        } catch {
          /* 弹窗被拦截时用户可复制链接 */
        }
      }, [vendorId])

      const tabs = mode === 'edit' ? ['apikey'] : ['apikey', 'oauth', 'discovery']

      return h(
        'div',
        { style: style.overlay, role: 'presentation' },
        h(
          'div',
          { style: style.dialog, role: 'dialog', 'aria-modal': 'true' },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
            h('h3', { style: style.title }, mode === 'edit' ? t('editTitle') : t('addTitle')),
            h(
              'span',
              {
                style: {
                  fontSize: 10,
                  lineHeight: 1.6,
                  color: 'var(--dsw-alias-label-secondary)',
                  border: '1px solid var(--dsw-alias-border-l1)',
                  borderRadius: 999,
                  padding: '0 8px',
                  whiteSpace: 'nowrap',
                },
              },
              'v1.5.0 · models + usage + top-up',
            ),
          ),
          h(
            'div',
            { style: style.tabs },
            ...tabs.map((entry) =>
              h(
                'button',
                {
                  key: entry,
                  type: 'button',
                  style: entry === tab ? style.tabActive : style.tab,
                  onClick: () => setTab(entry),
                },
                t(`tab.${entry}`),
              ),
            ),
          ),
          tab === 'apikey'
            ? h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.vendor')),
                  h(
                    'select',
                    {
                      style: style.input,
                      value: vendorId,
                      disabled: mode === 'edit',
                      onChange: (event) => {
                        setVendorId(event.target.value)
                        const found = VENDORS.find((entry) => entry.id === event.target.value)
                        if (found) setBaseUrl(found.baseUrl)
                        setProtocol(event.target.value === 'custom-anthropic' ? 'anthropic-messages' : '')
                      },
                    },
                    ...VENDORS.map((entry) => h('option', { key: entry.id, value: entry.id }, entry.label)),
                  ),
                ),
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.label')),
                  h('input', {
                    style: style.input,
                    value: label,
                    placeholder: VENDORS.find((entry) => entry.id === vendorId)?.label ?? '',
                    onChange: (event) => setLabel(event.target.value),
                  }),
                ),
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.protocol')),
                  h(
                    'select',
                    {
                      style: style.input,
                      value: protocol,
                      onChange: (event) => setProtocol(event.target.value),
                    },
                    h('option', { value: '' }, t('protocol.auto')),
                    h('option', { value: 'openai-compatible' }, 'OpenAI 兼容（Bearer）'),
                    h('option', { value: 'anthropic-messages' }, 'Anthropic Messages（x-api-key）'),
                    h('option', { value: 'gemini' }, 'Gemini（x-goog-api-key）'),
                  ),
                ),
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.balanceUrl')),
                  h('input', {
                    style: style.input,
                    value: balanceUrl,
                    placeholder: provider?.balanceUrl ?? t('field.balanceUrl.placeholder'),
                    onChange: (event) => setBalanceUrl(event.target.value),
                  }),
                ),
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.plan')),
                  h(
                    'div',
                    { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                    h(
                      'select',
                      {
                        style: { ...style.input, width: 150 },
                        value: planKind,
                        onChange: (event) => setPlanKind(event.target.value),
                      },
                      h('option', { value: 'payg' }, t('plan.payg')),
                      h('option', { value: 'subscription' }, t('plan.subscription')),
                    ),
                    planKind === 'subscription'
                      ? h('input', {
                          style: { ...style.input, width: 110 },
                          value: planLimit,
                          placeholder: t('field.planLimit'),
                          onChange: (event) => setPlanLimit(event.target.value),
                        })
                      : null,
                    planKind === 'subscription'
                      ? h(
                          'select',
                          {
                            style: { ...style.input, width: 120 },
                            value: planPeriod,
                            onChange: (event) => setPlanPeriod(event.target.value),
                          },
                          h('option', { value: 'day' }, t('period.day')),
                          h('option', { value: 'week' }, t('period.week')),
                          h('option', { value: 'month' }, t('period.month')),
                        )
                      : null,
                    planKind === 'subscription'
                      ? h('input', {
                          style: { ...style.input, width: 130 },
                          value: plan5hLimit,
                          placeholder: t('field.plan5h'),
                          onChange: (event) => setPlan5hLimit(event.target.value),
                        })
                      : null,
                  ),
                ),
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.baseUrl.both')),
                  h('input', {
                    style: style.input,
                    value: baseUrl,
                    placeholder: VENDORS.find((entry) => entry.id === vendorId)?.baseUrl ?? '',
                    onChange: (event) => setBaseUrl(event.target.value),
                  }),
                  h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 } },
                    h(
                      'div',
                      {
                        style: {
                          ...style.note,
                          opacity: PROTOCOL[vendorId] === 'anthropic-messages' ? 0.5 : 1,
                        },
                      },
                      t('proto.openai'),
                    ),
                    h(
                      'div',
                      {
                        style: {
                          ...style.note,
                          opacity: PROTOCOL[vendorId] === 'anthropic-messages' ? 1 : 0.5,
                        },
                      },
                      t('proto.anthropic'),
                    ),
                  ),
                ),
                PROTOCOL[vendorId] === 'anthropic-messages'
                  ? h('div', { style: style.note }, t('hint.anthropic'))
                  : null,
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.apiKey')),
                  h('input', {
                    style: style.input,
                    type: 'password',
                    value: apiKey,
                    autoComplete: 'off',
                    placeholder: mode === 'edit' ? '••••••（留空表示保持不变）' : 'sk-...',
                    onChange: (event) => setApiKey(event.target.value),
                  }),
                ),
                mode === 'add'
                  ? h(
                      'label',
                      { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 } },
                      h('input', {
                        type: 'checkbox',
                        checked: validate,
                        onChange: (event) => setValidate(event.target.checked),
                      }),
                      t('field.validate'),
                    )
                  : null,
              )
            : null,
          tab === 'oauth'
            ? h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                h(
                  'div',
                  { style: style.field },
                  h('span', { style: style.label }, t('field.vendor')),
                  h(
                    'select',
                    {
                      style: style.input,
                      value: vendorId,
                      onChange: (event) => setVendorId(event.target.value),
                    },
                    ...VENDORS.map((entry) => h('option', { key: entry.id, value: entry.id }, entry.label)),
                  ),
                ),
                h('div', { style: style.note }, t('oauthHint')),
                h(
                  'div',
                  { style: style.note },
                  `${t('oauthRedirect')}: ${typeof window !== 'undefined' ? `${window.location.origin}${BASE}/oauth/callback` : ''}`,
                ),
                h(
                  'button',
                  { type: 'button', style: style.primary, disabled: busy, onClick: () => void startOAuth() },
                  t('oauthStart'),
                ),
                oauth
                  ? h(
                      'div',
                      { style: oauth.ok ? style.note : style.errorText },
                      oauth.ok ? oauth.url : oauth.text,
                    )
                  : null,
              )
            : null,
          tab === 'discovery'
            ? h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                h('div', { style: style.note }, t('discoveryHint')),
                h(
                  'button',
                  { type: 'button', style: style.primary, disabled: busy, onClick: () => void scan() },
                  t('scan'),
                ),
                candidates === null ? h('div', { style: style.note }, t('discoveryIdle')) : null,
                candidates && candidates.length === 0 ? h('div', { style: style.note }, t('discoveryEmpty')) : null,
                ...(candidates ?? []).map((candidate) =>
                  h(
                    'div',
                    { key: candidate.candidateId, style: style.card },
                    h(StatusDot, { status: candidate.duplicate ? 'disabled' : 'unknown' }),
                    h(
                      'div',
                      { style: style.main },
                      h('div', { style: style.name }, `${candidate.label} · ${candidate.masked}`),
                      h('div', { style: style.meta }, `${candidate.source}: ${candidate.origin}${candidate.duplicate ? ` · ${t('duplicate')}` : ''}`),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        style: style.button,
                        disabled: busy || candidate.duplicate,
                        onClick: () => void importCandidate(candidate.candidateId),
                      },
                      t('import'),
                    ),
                  ),
                ),
              )
            : null,
          message ? h('div', { style: style.errorText }, message.text) : null,
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 } },
            h('button', { type: 'button', style: style.button, onClick: onClose }, t('cancel')),
            tab === 'apikey'
              ? h(
                  'button',
                  { type: 'button', style: style.primary, disabled: busy, onClick: () => void submit() },
                  t('save'),
                )
              : null,
          ),
        ),
      )
    }

    /**
     * 左侧栏图标（sidebar.panellist）：owner 传入 { size, active }。
     * 选中时用品牌色，未选中跟随 currentColor。
     */
    function QuotaNexusIcon({ size = 20, active = false }) {
      const edge = Number.isFinite(size) && size > 0 ? size : 20
      const accent = active ? 'var(--dsw-alias-brand-primary)' : 'currentColor'
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: edge,
          height: edge,
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('circle', { cx: 12, cy: 12, r: 2.4, fill: accent }),
        h(
          'g',
          { stroke: accent, strokeWidth: 1.6, strokeLinecap: 'round', opacity: active ? 0.95 : 0.7 },
          h('path', { d: 'M12 9.6V4.8' }),
          h('path', { d: 'M12 14.4v4.8' }),
          h('path', { d: 'M9.6 10.8 5.4 7.2' }),
          h('path', { d: 'M14.4 13.2 18.6 16.8' }),
          h('path', { d: 'M14.4 10.8 18.6 7.2' }),
          h('path', { d: 'M9.6 13.2 5.4 16.8' }),
        ),
        h(
          'g',
          { fill: accent },
          h('circle', { cx: 12, cy: 4, r: 1.3 }),
          h('circle', { cx: 12, cy: 20, r: 1.3 }),
          h('circle', { cx: 4.8, cy: 6.8, r: 1.3 }),
          h('circle', { cx: 19.2, cy: 17.2, r: 1.3 }),
          h('circle', { cx: 19.2, cy: 6.8, r: 1.3 }),
          h('circle', { cx: 4.8, cy: 17.2, r: 1.3 }),
        ),
      )
    }

    /** 左侧栏图标点开后的主面板（main: key = quota-nexus）。 */
    /**
     * 顶部用量条（注册到 conversation.session.header.utilities）。
     * 只读展示：当前模型、今日 token、人民币成本、缓存命中率。
     * 每 15s 自取一次；不消费 SSE，避免和面板的订阅互相干扰。
     */
    function UsageStrip(props) {
      const compact = props?.compact === true
      useBuildSelfHeal()
      const [data, setData] = useState(null)
      const [failure, setFailure] = useState(null)

      useEffect(() => {
        let alive = true
        const load = () => {
          void Promise.all([api('/api/overview'), api('/api/rotation'), api('/api/usage?range=day')])
            .then(([overview, rotation, usage]) => {
              if (!alive) return
              // api() 在传输层失败时返回 { ok:false, code }，不会抛错——必须显式判失败，
              // 否则界面会显示一堆 0 假装一切正常。
              const failed = overview?.ok === false ? overview : rotation?.ok === false ? rotation : null
              if (failed) {
                setFailure(failed)
                return
              }
              setFailure(null)
              setData({ overview, rotation, usage })
            })
            .catch((error) => {
              if (alive) setFailure({ ok: false, code: 'quota_nexus_network', message: String(error?.message ?? error) })
            })
        }
        load()
        const timer = setInterval(load, 15000)
        return () => {
          alive = false
          clearInterval(timer)
        }
      }, [])

      if (!data && failure) {
        // REST 不可用（例如 Host 启动顺序问题导致面板没注册）时也要可见，而不是整条消失。
        return h(
          'span',
          {
            'data-plugin': 'dsh-quota-nexus',
            title: `额度中枢不可用：${failure.code ?? 'unknown'} — ${failure.message ?? ''}`,
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 10px',
              borderRadius: 999,
              border: '1px solid var(--dsw-alias-state-error-primary)',
              fontSize: 11,
              lineHeight: '18px',
              color: 'var(--dsw-alias-state-error-primary)',
              whiteSpace: 'nowrap',
            },
          },
          `● 额度中枢不可用 (${failure.code ?? 'unknown'})`,
        )
      }
      if (!data) return null
      const rows = data.usage?.providers ?? []
      const tokens = rows.reduce((sum, row) => sum + (Number(row?.totals?.tokens) || 0), 0)
      const cost = rows.reduce((sum, row) => sum + (Number(row?.totals?.costAmount) || 0), 0)
      const hits = rows.map((row) => row?.totals?.cacheHitRate).filter((value) => Number.isFinite(value))
      const hit = hits.length ? Math.round((hits.reduce((sum, value) => sum + value, 0) / hits.length) * 10) / 10 : null
      const current = data.rotation?.current ?? null
      const model = current ? `${current.provider}/${current.model}` : '—'
      const rotationOn = Boolean(data.rotation?.enabled)
      const offline = data.overview?.ok === false
      const short = (value) =>
        value >= 1e9 ? (value / 1e9).toFixed(2) + 'B' : value >= 1e6 ? (value / 1e6).toFixed(2) + 'M' : value >= 1e3 ? (value / 1e3).toFixed(1) + 'K' : String(value)
      const item = (value) => h('span', { style: { whiteSpace: 'nowrap' } }, value)
      // 左下角空间窄：只留 模型短名 / 今日 tok / 成本。
      const shortModel = model.includes('/') ? model.split('/')[1] : model
      // 折叠导轨只有 56px：只留一个点 + 今日 token 缩写，不放模型名和金额。
      if (props?.wide === false) {
        return h(
          'span',
          {
            'data-plugin': 'dsh-quota-nexus',
            title: `${model} · 今日 ${short(tokens)} tok · ¥${cost.toFixed(4)}`,
            style: { fontSize: 10, color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap' },
          },
          `● ${short(tokens)}`,
        )
      }
      const dot = h('span', { style: { opacity: 0.35 } }, '|')

      return h(
        'div',
        {
          'data-plugin': 'dsh-quota-nexus',
          title: offline ? '额度中枢：REST 不可用' : `额度中枢 · 模型轮转${rotationOn ? '已开启' : '已关闭'}`,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 10px',
            borderRadius: 999,
            border: '1px solid var(--dsw-alias-border-l1)',
            background: 'var(--dsw-alias-bg-base)',
            fontSize: 11,
            lineHeight: '18px',
            color: 'var(--dsw-alias-label-secondary)',
            whiteSpace: 'nowrap',
          },
        },
        h(
          'span',
          { style: { color: offline ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' } },
          '●',
        ),
        item(compact ? shortModel : model),
        dot,
        item(compact ? `${short(tokens)} tok` : `今日 ${short(tokens)} tok`),
        dot,
        item(`¥${cost.toFixed(4)}`),
        compact || hit === null ? null : dot,
        compact || hit === null ? null : item(`缓存 ${hit}%`),
        compact || rotationOn ? null : h('span', { style: { opacity: 0.6 } }, '· 轮转关'),
      )
    }

    /** 左下角（用户名上方）的窄胶囊：复用 UsageStrip 的 compact 变体。 */
    function UsageFooter() {
      return h(UsageStrip, { compact: true })
    }

    /**
     * 版本自愈：客户端 bundle 与 Host 版本不一致时自动刷新一次页面。
     * 用 sessionStorage 记一次性标记，避免版本永久不匹配时反复刷新。
     */
    function useBuildSelfHeal() {
      useEffect(() => {
        void api('/api/overview')
          .then((overview) => {
            const hostBuild = overview?.build
            if (!hostBuild || hostBuild === BUILD_TAG) return
            const flag = 'quota-nexus.reload.' + hostBuild
            try {
              if (sessionStorage.getItem(flag)) return
              sessionStorage.setItem(flag, '1')
            } catch {
              return
            }
            window.location.reload()
          })
          .catch(() => {})
      }, [])
    }

    function QuotaNexusPanel() {
      return h(
        'div',
        {
          style: {
            height: '100%',
            overflow: 'auto',
            padding: '20px 24px 32px',
            boxSizing: 'border-box',
            background: 'var(--dsw-alias-bg-base)',
          },
        },
        h(
          'div',
          { style: { maxWidth: 960, margin: '0 auto' } },
          // 悬浮窗自己的标题栏：不管下面的 section 渲染成什么样，版本胶囊一定在这里可见。
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: '1px solid var(--dsw-alias-border-l1)',
              },
            },
            h('strong', { style: { fontSize: 14, fontWeight: 600 } }, isZh() ? '额度中枢' : 'Quota Nexus'),
            h(
              'span',
              {
                style: {
                  fontSize: 10.5,
                  color: 'var(--dsw-alias-label-secondary)',
                  border: '1px solid var(--dsw-alias-border-l1)',
                  borderRadius: 999,
                  padding: '1px 8px',
                },
              },
              BUILD_TAG,
            ),
          ),
          h(QuotaNexusSection, null),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get?.('locale')
        const disposeLocale = []
        try {
          if (typeof locale?.register === 'function') {
            disposeLocale.push(locale.register(NS, 'zh', DICT.zh))
            disposeLocale.push(locale.register(NS, 'en', DICT.en))
          }
        } catch {
          /* 词典注册失败不影响 UI，组件内回落内置词典 */
        }
        ctx.effect(() => () => {
          for (const dispose of disposeLocale) {
            try {
              dispose?.()
            } catch {
              /* 已释放 */
            }
          }
        })
        if (typeof locale?.bind === 'function') {
          const bound = locale.bind(NS)
          if (typeof bound === 'function') translateRef = bound
        }
        const title = () => (isZh() ? '额度中枢' : 'Quota Nexus')
        // 侧栏 label 带上构建号：刷新后一眼能确认浏览器加载的是哪一版 bundle。
        const titleWithBuild = () => `${title()} · ${BUILD_TAG}`

        // 设置页：完整管理页（卡片列表 + 策略 + 预警）。
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: 'quota-nexus', order: 12, label: title },
            QuotaNexusSection,
          ),
        )

        // 会话顶部栏：模型用量条（显示在用户窗口上方）。
        ctx.slots.inject('conversation.session.header.utilities', () =>
          ctx.slots.register(
            { name: 'conversation.session.header.utilities', id: 'quota-nexus-usage', order: 10, label: titleWithBuild },
            UsageStrip,
          ),
        )

        // 左下角（用户名上方）：模型用量窄胶囊。
        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'quota-nexus-usage', order: 10, label: titleWithBuild },
            UsageFooter,
          ),
        )

        // 左侧栏：面板图标（id 与下方 main 面板的 key 对应）。
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: 'quota-nexus', order: 5, label: titleWithBuild },
            QuotaNexusIcon,
          ),
        )

        // 主面板：点左侧栏图标后在内容列渲染同一份实时视图。
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'quota-nexus' }, QuotaNexusPanel),
        )
      },
    }
  },
})
