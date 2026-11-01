/**
 * dsh-quota-nexus — Client half (Web)。
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

    const NS = 'quota-nexus'
    const BASE = '/quota-nexus'
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
        'field.apiKey': 'API Key',
        'field.validate': '保存前校验连通性',
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
        'noQuotaData': '该账号尚未上报额度响应头',
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
        'field.apiKey': 'API Key',
        'field.validate': 'Verify connectivity before saving',
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
        'noQuotaData': 'No quota headers reported yet',
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
      { id: 'ollama', label: 'Ollama（本机）', baseUrl: 'http://127.0.0.1:11434/v1' },
      { id: 'custom', label: '自定义 OpenAI 兼容服务', baseUrl: '' },
    ]

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
        gap: 12,
        padding: '10px 12px',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      dot: { width: 8, height: 8, borderRadius: 999, flex: '0 0 auto' },
      main: { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
      rowTitle: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
      name: { fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      meta: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
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

    const pct = (ratio) => (typeof ratio === 'number' ? Math.round(ratio * 1000) / 10 : null)

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

    const ProviderCard = ({ provider, t, onEdit, onDelete, onProbe }) => {
      const quotaText =
        provider.quotaRatio === null || provider.quotaRatio === undefined
          ? t('noQuotaData')
          : `${t('quotaLeft')} ${pct(provider.quotaRatio)}%`
      const cooldown =
        provider.cooldownMs > 0 ? ` · ${t('cooldownLeft')} ${Math.ceil(provider.cooldownMs / 1000)}s` : ''
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
            `${provider.credential?.masked || '—'} · ${provider.baseUrl || '—'}${cooldown}`,
          ),
          h(QuotaBar, { ratio: provider.quotaRatio }),
          h('div', { style: style.meta }, quotaText),
        ),
        h(
          'div',
          { style: { display: 'flex', gap: 6, flex: '0 0 auto' } },
          h('button', { type: 'button', style: style.button, onClick: () => onProbe(provider) }, t('probe')),
          h('button', { type: 'button', style: style.button, onClick: () => onEdit(provider) }, t('edit')),
          h('button', { type: 'button', style: style.danger, onClick: () => onDelete(provider) }, t('delete')),
        ),
      )
    }

    function QuotaNexusSection() {
      const [snapshot, setSnapshot] = useState(null)
      const [error, setError] = useState(null)
      const [busy, setBusy] = useState(false)
      const [dialog, setDialog] = useState(null)

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
      const alerts = (snapshot?.alerts ?? []).slice(0, 3)
      const warnings = snapshot?.warnings ?? []

      return h(
        'section',
        { style: style.section, 'data-plugin': 'dsh-quota-nexus' },
        h(
          'div',
          { style: style.header },
          h(
            'div',
            null,
            h('h2', { style: style.title }, t('title')),
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
          { style: style.chips },
          h('span', { style: style.chip }, `providers ${counts.providers ?? 0}`),
          h('span', { style: style.chip }, `active ${counts.active ?? 0}`),
          h('span', { style: style.chip }, `cooldown ${counts.cooling ?? 0}`),
          h('span', { style: style.chip }, `re-login ${counts.needsRelogin ?? 0}`),
          h('span', { style: style.chip }, `ledger ${snapshot?.ledger?.queued ?? 0}/${snapshot?.ledger?.flushed ?? 0}`),
        ),
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
                  onEdit: (entry) => setDialog({ mode: 'edit', provider: entry }),
                  onDelete: remove,
                  onProbe: probe,
                }),
              )
            : [h('div', { key: 'empty', style: style.note }, snapshot ? t('empty') : t('loading'))]),
          h(
            'button',
            { type: 'button', style: style.addRow, onClick: () => setDialog({ mode: 'add' }) },
            t('add'),
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
            ? { id: provider.id, label: label || provider.label, baseUrl, apiKey: apiKey || undefined }
            : {
                vendorId,
                label: label || undefined,
                baseUrl: baseUrl || undefined,
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
          h('h3', { style: style.title }, mode === 'edit' ? t('editTitle') : t('addTitle')),
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
                  h('span', { style: style.label }, t('field.baseUrl')),
                  h('input', {
                    style: style.input,
                    value: baseUrl,
                    placeholder: VENDORS.find((entry) => entry.id === vendorId)?.baseUrl ?? '',
                    onChange: (event) => setBaseUrl(event.target.value),
                  }),
                ),
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
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'quota-nexus',
              order: 12,
              label: () => {
                const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en'
                return lang.toLowerCase().startsWith('zh') ? '额度中枢' : 'Quota Nexus'
              },
            },
            QuotaNexusSection,
          ),
        )
      },
    }
  },
})
