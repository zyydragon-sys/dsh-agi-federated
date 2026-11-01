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
            if (!response.ok) throw new Error('HTTP ' + response.status);
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

    function Row({ label, value }) {
      return h('div', {
        style: { display: 'flex', justifyContent: 'space-between', gap: 18, padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' },
      },
        h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, label),
        h('span', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 600, textAlign: 'right' } }, value),
      );
    }

    function Card({ title, children }) {
      return h('section', {
        style: {
          border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 12,
          background: 'var(--dsw-alias-bg-layer-1)', padding: 16,
        },
      }, h('h3', { style: { margin: '0 0 8px', fontSize: 13, color: 'var(--dsw-alias-label-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' } }, title), children);
    }

    function Panel() {
      const { data, error, loading } = useStatus();
      const ok = Boolean(data && data.ok);
      const degraded = Boolean(data && data.degraded);
      const evidence = data && data.evidence ? data.evidence : {};
      const skills = data && data.skills ? data.skills : {};
      const audit = data && data.audit ? data.audit : {};
      const usage = data && data.session ? data.session : {};
      const model = data && data.model ? data.model : {};
      const fed = data && data.federation ? data.federation : {};
      const generated = data && data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—';
      return h('div', { style: { padding: '28px clamp(18px, 4vw, 48px)', maxWidth: 880, margin: '0 auto', color: 'var(--dsw-alias-label-primary)' } },
        h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 } },
          h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('div', { style: { width: 38, height: 38, borderRadius: 10, background: 'var(--dsw-alias-bg-layer-2)', display: 'grid', placeItems: 'center' } }, h(Icon, { size: 22, active: true })),
              h('h1', { style: { margin: 0, fontSize: 22, lineHeight: '30px' } }, 'AGI Federated'),
            ),
            h('p', { style: { margin: '4px 0 0 48px', color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, 'DeepSeek Harness 插件安装成果'),
          ),
          h(Chip, { tone: ok && !degraded ? 'ok' : degraded ? 'warn' : 'bad' }, loading ? '读取中' : ok && !degraded ? '已安装 · ACTIVE' : degraded ? '已安装 · DEGRADED' : '未连接'),
        ),
        error ? h('div', { style: { marginBottom: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--dsw-alias-state-warn-primary)', color: 'var(--dsw-alias-state-warn-primary)', fontSize: 13 } }, '状态读取失败：' + error) : null,
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18, fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } },
          h(Chip, { tone: 'ok' }, 'v' + (data && data.version ? data.version : '1.0.1')),
          h('span', null, 'Host ' + (data && data.compat && data.compat.hostVersion ? data.compat.hostVersion : '0.2.1-rc.5')),
          h('span', null, '·'),
          h('span', null, '更新于 ' + generated),
        ),
        h('div', { style: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' } },
          h(Card, { title: '运行状态' },
            h(Row, { label: '模型', value: (model.provider || '—') + ' / ' + (model.model || '—') }),
            h(Row, { label: '本次上下文', value: (usage.contextTokens || 0).toLocaleString() + ' tokens' }),
            h(Row, { label: '会话费用', value: '$' + Number(data && data.cost && data.cost.sessionUsd ? data.cost.sessionUsd : 0).toFixed(4) }),
            h(Row, { label: 'Provider', value: (data && data.providers ? data.providers.filter((p) => p.status === 'ok').length : 0) + ' 个正常' }),
          ),
          h(Card, { title: '记忆与证据' },
            h(Row, { label: 'Hot Memory', value: '24 条上限 · 字节稳定' }),
            h(Row, { label: 'Evidence', value: (evidence.records || 0) + ' 条 / ' + (evidence.sessions || 0) + ' 个会话' }),
            h(Row, { label: 'Clue Store', value: 'BM25 长尾召回' }),
            h(Row, { label: 'Checkpoint', value: '确定性表面压缩' }),
          ),
          h(Card, { title: '技能与审计' },
            h(Row, { label: 'Skills staged', value: String(skills.staged || 0) }),
            h(Row, { label: 'Skills promoted', value: String(skills.promoted || 0) }),
            h(Row, { label: 'Audit', value: 'seq ' + (audit.seq || 0) + (audit.broken ? ' · BROKEN' : ' · 完整') }),
            h(Row, { label: 'Security', value: '证据闸门 · 零信任' }),
          ),
          h(Card, { title: '联邦 seams' },
            ['jepa', 'cuv', 'mpRcp'].map((key) => h(Row, {
              key,
              label: key === 'mpRcp' ? 'mp-rcp' : key.toUpperCase(),
              value: fed[key] ? (fed[key].enabled ? (fed[key].blocking ? 'enabled · blocking' : 'enabled · advisory') : 'disabled') : '—',
            })),
          ),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, alignItems: 'center' } },
          h('a', { href: REPO, target: '_blank', rel: 'noreferrer', style: { color: 'var(--dsw-alias-brand-primary)', fontSize: 13, fontWeight: 600 } }, 'GitHub 仓库'),
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '·'),
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 13 } }, '市场目录：等待 1 天规则后提交 PR'),
          h('a', { href: '/agi-federated/status', target: '_blank', rel: 'noreferrer', style: { marginLeft: 'auto', color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, '原始状态 JSON'),
        ),
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
