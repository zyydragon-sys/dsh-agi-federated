window.__ModuleLoader__.load({
  id: 'dsh-agi-federated',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const STATUS_URL = '/agi-federated/status';
    const REPO = 'https://github.com/zyydragon-sys/dsh-agi-federated';

    function useStatus() {
      const [state, setState] = React.useState({ loading: true, data: null, error: '' });
      React.useEffect(() => {
        let alive = true;
        let timer = null;
        async function load() {
          try {
            const response = await fetch(STATUS_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error(response.status === 404 ? 'Host 插件未激活（404）；请启用或重启 DSH' : 'HTTP ' + response.status);
            const data = await response.json();
            if (alive) setState({ loading: false, data, error: '' });
          } catch (error) {
            if (alive) setState((previous) => ({ loading: false, data: previous.data, error: String(error.message || error) }));
          }
        }
        load();
        timer = setInterval(load, 2000);
        return () => { alive = false; if (timer) clearInterval(timer); };
      }, []);
      return state;
    }

    function Icon({ size = 18, active = false }) {
      const edge = active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)';
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('path', { d: 'M12 3.5 19.5 8v8L12 20.5 4.5 16V8L12 3.5Z', stroke: edge, strokeWidth: 1.4 }),
        h('circle', { cx: 12, cy: 12, r: 2.2, fill: active ? 'var(--dsw-alias-brand-primary)' : edge }),
        h('path', { d: 'M12 3.5v6.3M12 14.2v6.3M4.5 8l5.3 3M14.2 13l5.3 3M19.5 8l-5.3 3M9.8 13l-5.3 3', stroke: edge, strokeWidth: 1.1, opacity: 0.8 }),
      );
    }

    function Chip({ children, tone = 'neutral' }) {
      const color = tone === 'ok' ? 'var(--dsw-alias-state-success-primary)'
        : tone === 'warn' ? 'var(--dsw-alias-state-warn-primary)'
        : tone === 'bad' ? 'var(--dsw-alias-state-error-primary)'
        : 'var(--dsw-alias-label-secondary)';
      return h('span', {
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: '1px solid ' + color, borderRadius: 999, padding: '2px 9px',
          color, fontSize: 12, fontWeight: 600, lineHeight: '18px',
        },
      }, h('span', { style: { width: 6, height: 6, borderRadius: 99, background: color } }), children);
    }

    function Row({ label, value, valueColor }) {
      return h('div', {
        style: { display: 'flex', justifyContent: 'space-between', gap: 18, padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' },
      },
        h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, label),
        h('span', { style: { color: valueColor || 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 600, textAlign: 'right' } }, value),
      );
    }

    function Card({ title, children, onClick }) {
      const interactive = typeof onClick === 'function';
      return h('section', {
        role: interactive ? 'button' : undefined,
        tabIndex: interactive ? 0 : undefined,
        onClick,
        onKeyDown: interactive ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); }
        } : undefined,
        style: {
          border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 12,
          background: 'var(--dsw-alias-bg-layer-1)', padding: 16,
          cursor: interactive ? 'pointer' : 'default',
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
          h('h3', { style: { margin: 0, fontSize: 13, color: 'var(--dsw-alias-label-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' } }, title),
          interactive ? h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-brand-primary)' } }, '详情') : null,
        ),
        children,
      );
    }

    function Detail({ state, onClose, onReload }) {
      const kind = state.kind;
      const data = state.data;
      const d = data && data.details ? data.details : {};
      const [query, setQuery] = React.useState('');
      const needle = query.trim().toLowerCase();
      const matches = (value) => !needle || String(value || '').toLowerCase().includes(needle);
      const clues = (d.memory?.clues || []).filter((clue) => matches(clue.summary) || matches((clue.keywords || []).join(' ')));
      const bank = (d.memory?.bank || []).filter((item) => matches(item.title) || matches(item.summary) || matches((item.tags || []).join(' ')));
      const evidence = (d.evidence?.recent || []).filter((record) => matches(record.tool) || matches(record.summary));
      const skills = (d.skills?.list || []).filter((skill) => matches(skill.name) || matches((skill.tags || []).join(' ')));
      const titles = { runtime: '运行状态', memory: '记忆与证据', skills: '技能与审计', federation: '联邦 seams', health: '信任自检' };
      const searchable = kind === 'memory' || kind === 'skills';
      let body = null;
      if (state.loading) body = h('p', { style: { color: 'var(--dsw-alias-label-secondary)' } }, '读取中…');
      else if (state.error) body = h('p', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, state.error);
      else if (kind === 'runtime') {
        body = h(React.Fragment, null,
          h(Row, { label: '模型', value: (data.model?.provider || '—') + ' / ' + (data.model?.model || '—') }),
          h(Row, { label: '上次请求', value: (data.lastSettlement?.usage ? (data.lastSettlement.usage.inputTokens || 0) + ' in · ' + (data.lastSettlement.usage.cacheReadTokens || 0) + ' cache · ' + (data.lastSettlement.usage.outputTokens || 0) + ' out' : '—') }),
          h(Row, { label: '上下文', value: (data.session?.contextTokens || 0).toLocaleString() + ' / ' + (data.session?.contextWindow || 0).toLocaleString() + ' · ' + Math.round((data.session?.contextRatio || 0) * 100) + '%', valueColor: data.session?.contextLevel === 'critical' ? 'var(--dsw-alias-state-error-primary)' : data.session?.contextLevel === 'warn' ? 'var(--dsw-alias-state-warn-primary)' : undefined }),
          h(Row, { label: '会话费用', value: '$' + Number(data.cost?.sessionUsd || 0).toFixed(4) }),
          h(Row, { label: '本月费用', value: '$' + Number(data.cost?.monthUsd || 0).toFixed(4) }),
          h(Row, { label: '计费时段', value: data.pricing?.peak ? 'peak · 官网价 x2' : 'off-peak · 官网价' }),
          ...(data.providers || []).map((provider) => h(Row, {
            key: provider.id,
            label: provider.label || provider.id,
            value: (provider.status || '—') + (provider.balance == null ? '' : ' · ' + provider.balance + ' ' + (provider.currency || '')),
          })),
          h('h4', { style: { margin: '16px 0 8px', fontSize: 13 } }, '最近使用模型'),
          ...(data.modelHistory?.length ? data.modelHistory.slice().reverse().map((item, index) => h('div', {
            key: index,
            style: { padding: '6px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)', fontSize: 12 },
          }, h('span', { style: { fontWeight: 600 } }, (item.provider || '—') + ' / ' + (item.model || '—')), h('span', { style: { marginLeft: 8, color: 'var(--dsw-alias-label-secondary)' } }, item.source || ''))) : h('p', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '尚未记录模型切换')),
        );
      } else if (kind === 'memory') {
        body = h(React.Fragment, null,
          h('h4', { style: { margin: '0 0 8px', fontSize: 13 } }, 'Hot Memory'),
          h('pre', { style: { margin: '0 0 16px', padding: 12, borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2)', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.55, overflow: 'auto' } }, d.memory?.text || '（空）'),
          h('h4', { style: { margin: '0 0 8px', fontSize: 13 } }, 'Project Memory · ' + bank.length),
          ...(bank.length ? bank.slice().reverse().map((item) => h('div', {
            key: item.id,
            style: { padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)', fontSize: 12 },
          }, h('div', { style: { fontWeight: 600 } }, '[' + item.kind + '] ' + item.title), h('div', { style: { color: 'var(--dsw-alias-label-secondary)', marginTop: 3 } }, item.summary || '—'), h('div', { style: { color: 'var(--dsw-alias-label-secondary)', marginTop: 4 } }, (item.tags || []).join(' · ') + (item.links?.length ? '  ↳ ' + item.links.map((link) => link.title).join(' · ') : '')))) : h('p', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '暂无项目记忆')),
          h('h4', { style: { margin: '16px 0 8px', fontSize: 13 } }, 'Clue Store · ' + clues.length),
          ...(clues.length ? clues.map((clue, index) => h('div', {
            key: index,
            style: { padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)', fontSize: 12 },
          }, h('div', { style: { fontWeight: 600 } }, '[' + clue.kind + '] ' + clue.summary), h('div', { style: { color: 'var(--dsw-alias-label-secondary)', marginTop: 3 } }, (clue.keywords || []).slice(0, 8).join(' · ')))) : h('p', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '暂无线索')),
          h('h4', { style: { margin: '16px 0 8px', fontSize: 13 } }, 'Evidence · ' + evidence.length),
          ...(evidence.length ? evidence.slice().reverse().map((record, index) => h('div', {
            key: index,
            style: { padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)', fontSize: 12 },
          }, h('div', { style: { fontWeight: 600 } }, '[' + record.level + '] ' + record.tool), h('div', { style: { color: 'var(--dsw-alias-label-secondary)', marginTop: 3 } }, record.summary || '—'))) : h('p', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '暂无证据')),
        );
      } else if (kind === 'skills') {
        body = h(React.Fragment, null,
          h('h4', { style: { margin: '0 0 8px', fontSize: 13 } }, 'Skills · ' + skills.length),
          ...(skills.length ? skills.map((skill) => h('div', {
            key: skill.id,
            style: { padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)', fontSize: 12 },
          }, h('div', { style: { fontWeight: 600 } }, skill.name + ' · ' + skill.stage), h('div', { style: { color: 'var(--dsw-alias-label-secondary)', marginTop: 3 } }, (skill.bytes || 0) + ' bytes · ' + ((skill.tags || []).join(', ') || 'no tags')))) : h('p', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '暂无 skills')),
          h('h4', { style: { margin: '16px 0 8px', fontSize: 13 } }, 'Audit'),
          h(Row, { label: 'seq', value: String(data.audit?.seq || 0) }),
          h(Row, { label: 'chain', value: data.audit?.broken ? 'BROKEN' : '完整' }),
          ...(data.audit?.recent || []).slice().reverse().map((entry, index) => h('div', {
            key: index,
            style: { padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)', fontSize: 12 },
          }, h('div', { style: { fontWeight: 600 } }, '[' + entry.kind + '] ' + (entry.subject || '')), h('div', { style: { color: 'var(--dsw-alias-label-secondary)', marginTop: 3 } }, entry.reason || '—'))),
        );
      } else if (kind === 'health') {
        body = h(React.Fragment, null,
          h(Row, { label: 'Host', value: data.health?.ok ? 'ok' : 'degraded' }),
          h(Row, { label: 'Audit chain', value: data.audit?.broken ? 'broken' : '完整' }),
          h(Row, { label: 'Evidence gate', value: data.health?.evidenceGate || '—' }),
          h(Row, { label: 'Memory bounded', value: data.health?.memoryBounded ? 'yes' : 'no' }),
          h(Row, { label: 'Model tracked', value: data.health?.modelTracked ? 'yes' : 'no' }),
          h(Row, { label: 'Context level', value: data.health?.contextLevel || '—' }),
          h(Row, { label: 'Pricing window', value: data.pricing?.peak ? 'peak' : 'off-peak' }),
          h('p', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, marginTop: 12 } }, '白箱自检只报告可观测事实；不自动修改证据、模型或审计状态。'),
        );
      } else {
        body = h(React.Fragment, null,
          ...['jepa', 'cuv', 'mpRcp'].map((key) => {
            const item = data.federation?.[key] || {};
            return h(Row, {
              key,
              label: key === 'mpRcp' ? 'mp-rcp' : key.toUpperCase(),
              value: item.enabled ? (item.blocking ? 'enabled · blocking' : 'enabled · advisory') : 'disabled',
            });
          }),
          h('p', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, marginTop: 12 } }, '所有 seam 默认 advisory allow；失败被隔离并记录日志。'),
        );
      }
      if (searchable && !state.loading && !state.error) {
        body = h(React.Fragment, null,
          h('input', {
            value: query,
            onChange: (event) => setQuery(event.target.value),
            placeholder: '搜索记忆、证据、技能…',
            style: {
              width: '100%', boxSizing: 'border-box', marginBottom: 14,
              padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--dsw-alias-border-l1)',
              background: 'var(--dsw-alias-bg-layer-2)',
              color: 'var(--dsw-alias-label-primary)', fontSize: 13, outline: 'none',
            },
          }),
          body,
        );
      }
      return h('div', {
        style: { position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.36)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
        onClick: onClose,
      },
        h('div', {
          style: { width: 'min(760px, 100%)', maxHeight: '82vh', overflow: 'auto', background: 'var(--dsw-alias-bg-overlay)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 14, padding: 20, boxShadow: '0 18px 60px rgba(0,0,0,.28)' },
          onClick: (event) => event.stopPropagation(),
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 } },
            h('h2', { style: { margin: 0, fontSize: 18 } }, titles[kind] || '详情'),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { onClick: onReload, style: { border: '1px solid var(--dsw-alias-border-l1)', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12 } }, '刷新'),
              h('button', { onClick: onClose, style: { border: '1px solid var(--dsw-alias-border-l1)', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12 } }, '关闭'),
            ),
          ),
          body,
        ),
      );
    }

    function Panel() {
      const { data, error, loading } = useStatus();
      const [detail, setDetail] = React.useState(null);
      const ok = Boolean(data && data.ok);
      const degraded = Boolean(data && data.degraded);
      const evidence = data && data.evidence ? data.evidence : {};
      const skills = data && data.skills ? data.skills : {};
      const audit = data && data.audit ? data.audit : {};
      const usage = data && data.session ? data.session : {};
      const model = data && data.model ? data.model : {};
      const fed = data && data.federation ? data.federation : {};
      const generated = data && data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—';

      async function openDetail(kind) {
        setDetail({ kind, loading: true, data: null, error: '' });
        try {
          const query = data && data.sessionId ? '?details=1&sessionId=' + encodeURIComponent(data.sessionId) : '?details=1';
          const response = await fetch(STATUS_URL + query, { cache: 'no-store' });
          if (!response.ok) throw new Error(response.status === 404 ? 'Host 插件未激活（404）' : 'HTTP ' + response.status);
          const payload = await response.json();
          setDetail({ kind, loading: false, data: payload, error: '' });
        } catch (failure) {
          setDetail({ kind, loading: false, data: null, error: String(failure.message || failure) });
        }
      }

      return h('div', { style: { padding: '28px clamp(18px, 4vw, 48px)', maxWidth: 880, margin: '0 auto', color: 'var(--dsw-alias-label-primary)' } },
        h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 } },
          h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('div', { style: { width: 38, height: 38, borderRadius: 10, background: 'var(--dsw-alias-bg-layer-2)', display: 'grid', placeItems: 'center' } }, h(Icon, { size: 22, active: true })),
              h('h1', { style: { margin: 0, fontSize: 22, lineHeight: '30px' } }, 'AGI Federated'),
            ),
            h('p', { style: { margin: '4px 0 0 48px', color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, 'DeepSeek Harness 插件安装成果'),
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('button', {
              onClick: () => window.location.reload(),
              title: '重新加载 Web 界面；Host 中的运行会话和排队消息不受影响',
              style: { border: '1px solid var(--dsw-alias-border-l1)', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
            }, '刷新界面'),
            h(Chip, { tone: ok && !degraded ? 'ok' : degraded ? 'warn' : 'bad' }, loading ? '读取中' : ok && !degraded ? '已安装 · ACTIVE' : degraded ? '已安装 · DEGRADED' : '未连接'),
          ),
        ),
        error ? h('div', { style: { marginBottom: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--dsw-alias-state-warn-primary)', color: 'var(--dsw-alias-state-warn-primary)', fontSize: 13 } }, '状态读取失败：' + error) : null,
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18, fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } },
          h(Chip, { tone: 'ok' }, 'v' + (data && data.version ? data.version : '1.1.0')),
          h('span', null, 'Host ' + (data && data.compat && data.compat.hostVersion ? data.compat.hostVersion : '0.2.1-rc.5')),
          h('span', null, '·'),
          h('span', null, '更新于 ' + generated),
        ),
        h('div', { style: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' } },
          h(Card, { title: '运行状态', onClick: () => openDetail('runtime') },
            h(Row, { label: '模型', value: (model.provider || '—') + ' / ' + (model.model || '—') }),
            h(Row, { label: '上次请求', value: (usage.contextTokens || 0).toLocaleString() + ' (' + Math.round((usage.contextRatio || 0) * 100) + '%)', valueColor: usage.contextLevel === 'critical' ? 'var(--dsw-alias-state-error-primary)' : usage.contextLevel === 'warn' ? 'var(--dsw-alias-state-warn-primary)' : undefined }),
            h(Row, { label: '会话费用', value: '$' + Number(data && data.cost && data.cost.sessionUsd ? data.cost.sessionUsd : 0).toFixed(4) }),
            h(Row, { label: 'Provider', value: (data && data.providers ? data.providers.filter((p) => p.status === 'ok').length : 0) + ' 个正常' }),
          ),
          h(Card, { title: '记忆与证据', onClick: () => openDetail('memory') },
            h(Row, { label: 'Hot Memory', value: '24 条上限 · 字节稳定' }),
            h(Row, { label: 'Project Memory', value: (data.memory?.bank || 0) + ' 页' }),
            h(Row, { label: 'Evidence', value: (evidence.records || 0) + ' 条 / ' + (evidence.sessions || 0) + ' 个会话' }),
            h(Row, { label: 'Clue Store', value: 'BM25 长尾召回' }),
            h(Row, { label: 'Checkpoint', value: '确定性表面压缩' }),
          ),
          h(Card, { title: '技能与审计', onClick: () => openDetail('skills') },
            h(Row, { label: 'Skills staged', value: String(skills.staged || 0) }),
            h(Row, { label: 'Skills promoted', value: String(skills.promoted || 0) }),
            h(Row, { label: 'Audit', value: 'seq ' + (audit.seq || 0) + (audit.broken ? ' · BROKEN' : ' · 完整') }),
            h(Row, { label: 'Security', value: '证据闸门 · 零信任' }),
          ),
          h(Card, { title: '联邦 seams', onClick: () => openDetail('federation') },
            ['jepa', 'cuv', 'mpRcp'].map((key) => h(Row, {
              key,
              label: key === 'mpRcp' ? 'mp-rcp' : key.toUpperCase(),
              value: fed[key] ? (fed[key].enabled ? (fed[key].blocking ? 'enabled · blocking' : 'enabled · advisory') : 'disabled') : '—',
            })),
          ),
          h(Card, { title: '信任自检', onClick: () => openDetail('health') },
            h(Row, { label: 'Host', value: data?.health?.ok ? 'ok' : 'degraded' }),
            h(Row, { label: 'Audit chain', value: data?.health?.auditChain || '—' }),
            h(Row, { label: 'Evidence gate', value: data?.health?.evidenceGate || '—' }),
            h(Row, { label: 'Model tracked', value: data?.health?.modelTracked ? 'yes' : 'no' }),
          ),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, alignItems: 'center' } },
          h('a', { href: REPO, target: '_blank', rel: 'noreferrer', style: { color: 'var(--dsw-alias-brand-primary)', fontSize: 13, fontWeight: 600 } }, 'GitHub 仓库'),
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '·'),
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '点击卡片查看记忆、证据、技能、审计与 Seams 详情'),
          h('a', { href: STATUS_URL, target: '_blank', rel: 'noreferrer', style: { marginLeft: 'auto', color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, '原始状态 JSON'),
        ),
        detail ? h(Detail, {
          state: detail,
          onClose: () => setDetail(null),
          onReload: () => openDetail(detail.kind),
        }) : null,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: 'agi-federated', order: 20, label: 'AGI',
        }, Icon));
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: 'agi-federated',
        }, Panel));
      },
    };
  },
});
