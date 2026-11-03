window.__ModuleLoader__.load({
  id: 'dsh-arch-01-baseline',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'archBaseline'
    const DOC_ROUTE = '/arch-baseline/arch-01.md'
    const LIVE_ROUTE = '/arch-baseline/live.json'
    const FOCUS_ACK_ROUTE = '/arch-baseline/focus-ack.json'
    const DIAGNOSTICS_ROUTE = '/arch-baseline/diagnostics.json'
    const UPDATES_ROUTE = '/arch-baseline/updates.json'
    const UPGRADE_ROUTE = '/arch-baseline/upgrade.json'
    const LOAD_TIMEOUT_MS = 10000
    const LIVE_POLL_MS = 8000
    const MONO =
      "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'Microsoft YaHei Mono', monospace"

    const DICTS = {
      zh: {
        title: 'ARCH-01 架构基线',
        subtitle: 'DSH 基础安装架构 · 完整提示词 v3（MCP 强化版）',
        loading: '正在读取架构基线…',
        timeout: '读取超过 10 秒仍未返回，可重试。',
        errorTitle: '读取失败',
        retry: '重试',
        refresh: '刷新',
        tabDiagram: '架构',
        tabText: '全文',
        chars: '字符',
        lines: '行',
        sections: '章节',
        charsShort: '字符',
        layersTitle: '分层架构',
        viewLayers: '分层',
        viewMcp: 'MCP 矩阵',
        viewPipeline: '启动顺序',
        mcpTitle: 'MCP 服务器矩阵',
        pipelineTitle: '启动顺序',
        runtimeTitle: '运行时状态',
        refreshRuntime: '刷新运行时',
        runtimeHint: '来自当前 Host 的真实插件与工具状态',
        statTotal: '插件条目',
        statActive: '运行中',
        statDisabled: '基线停用',
        baselineTitle: '基线停用项',
        baselineNote: '这些是官方 bundle 的基线行，已被上层 bundle 覆盖或默认关闭；它们由 bundle 管理，无法在 profile 层删除，能力已由活动行提供，不影响使用。',
        baselineLegend: '基线停用',
        updatesTitle: '插件更新',
        checkUpdates: '检查更新',
        updatesChecking: '检查中…',
        updatesUpToDate: '全部插件已是最新',
        upgrade: '升级',
        upgrading: '升级中…',
        upgradeOk: '升级成功',
        upgradeFailed: '升级失败',
        updateHint: '版本来自 npm registry，与当前安装版本比对',
        statAttention: '需处理',
        statTools: '工具',
        updatedAt: '更新于',
        openPlugins: '打开插件页',
        selfCheck: '运行自检',
        searchPlaceholder: '搜索组件、层或服务器…',
        searchClear: '清除',
        searchEmpty: '没有匹配项',
        expandAll: '展开全部',
        collapseAll: '收起全部',
        itemCount: '项',
        runningCount: '运行',
        inspectorTitle: '检查器',
        inspectorHint: '选择左侧的层、组件或服务器，查看结构化详情；不会离开架构视图。',
        back: '返回总览',
        viewSection: '在全文查看',
        copyConfig: '复制配置',
        copied: '配置已复制',
        copyFailed: '复制失败，请手动选择文本',
        configLabel: '配置',
        commandLabel: '命令',
        roleLabel: '职责',
        transportLabel: '传输',
        layerLabel: '所属层',
        statusLabel: '状态',
        noConfig: '文档未给出独立配置，见 §5.2 服务器矩阵。',
        statusActive: '运行中',
        statusDisabled: '已停用',
        statusFailed: '异常',
        statusAbsent: '文档组件，未在当前 profile 安装',
        statusPending: '加载中',
        statusBroken: '导入失败（缺少依赖）',
        legendRun: '运行中',
        legendStopped: '已停用',
        legendBroken: '导入失败',
        layerHostLive: '宿主运行中',
        layerIsolated: '隔离（不参与启动）',
        layerProtocol: '协议层就绪',
        fixListTitle: '待修复条目',
        fixListHint: '这些条目已启用但无法导入；安装对应依赖后才会恢复，不会显示为绿灯。',
        constraintTitle: '关键约束',
        layerSection: '所属分层',
        docTitle: '文档',
        docBytes: '字节',
        profileLabel: 'Profile',
        packagesLabel: '包',
        selfCheckOk: '自检通过',
        selfCheckWarn: '自检发现异常',
        selfCheckUnavailable: '当前环境无法运行页面自检',
        emptyDiagram: '未能从文档中提取分层结构，已切换为全文视图。',
        parseError: '文档解析失败，已回退显示原文',
        boundaryTitle: '面板渲染异常',
        boundaryHint: '可关闭后重开该面板重试；架构内容仍可用 arch_baseline 工具读取。',
        liveError: '运行时数据不可用',
      },
      en: {
        title: 'ARCH-01 Architecture Baseline',
        subtitle: 'DSH installation architecture · full prompt v3 (MCP-enhanced)',
        loading: 'Reading the architecture baseline…',
        timeout: 'Still loading after 10 seconds. You can retry.',
        errorTitle: 'Failed to load',
        retry: 'Retry',
        refresh: 'Refresh',
        tabDiagram: 'Architecture',
        tabText: 'Document',
        chars: 'chars',
        lines: 'lines',
        sections: 'sections',
        charsShort: 'chars',
        layersTitle: 'Layers',
        viewLayers: 'Layers',
        viewMcp: 'MCP matrix',
        viewPipeline: 'Startup',
        mcpTitle: 'MCP server matrix',
        pipelineTitle: 'Startup order',
        runtimeTitle: 'Runtime status',
        refreshRuntime: 'Refresh runtime',
        runtimeHint: 'Live plugins and tools from this Host',
        statTotal: 'Entries',
        statActive: 'Running',
        statDisabled: 'Baseline off',
        baselineTitle: 'Baseline-off rows',
        baselineNote: 'These are official-bundle baseline rows, overridden or disabled by a higher bundle layer. They belong to bundles and cannot be deleted from the profile; their capability is provided by active rows, so nothing is broken.',
        baselineLegend: 'Baseline off',
        updatesTitle: 'Plugin updates',
        checkUpdates: 'Check now',
        updatesChecking: 'Checking…',
        updatesUpToDate: 'All plugins are up to date',
        upgrade: 'Upgrade',
        upgrading: 'Upgrading…',
        upgradeOk: 'upgraded',
        upgradeFailed: 'Upgrade failed',
        updateHint: 'Versions come from the npm registry and are compared with installed versions',
        statAttention: 'Needs attention',
        statTools: 'Tools',
        updatedAt: 'Updated',
        openPlugins: 'Open Plugins',
        selfCheck: 'Run self-check',
        searchPlaceholder: 'Search components, layers, servers…',
        searchClear: 'Clear',
        searchEmpty: 'No matches',
        expandAll: 'Expand all',
        collapseAll: 'Collapse all',
        itemCount: 'items',
        runningCount: 'running',
        inspectorTitle: 'Inspector',
        inspectorHint: 'Select a layer, component or server on the left to inspect it in place.',
        back: 'Back to overview',
        viewSection: 'Open in document',
        copyConfig: 'Copy config',
        copied: 'Configuration copied',
        copyFailed: 'Copy failed; select the text manually',
        configLabel: 'Config',
        commandLabel: 'Command',
        roleLabel: 'Role',
        transportLabel: 'Transport',
        layerLabel: 'Layer',
        statusLabel: 'Status',
        noConfig: 'The document has no standalone config for this server; see the §5.2 matrix.',
        statusActive: 'Running',
        statusDisabled: 'Disabled',
        statusFailed: 'Failed',
        statusAbsent: 'Documented component, not installed in this profile',
        statusPending: 'Loading',
        statusBroken: 'Import failed (missing dependency)',
        legendRun: 'Running',
        legendStopped: 'Disabled',
        legendBroken: 'Import failed',
        layerHostLive: 'Host running',
        layerIsolated: 'Isolated (not started)',
        layerProtocol: 'Protocol ready',
        fixListTitle: 'Entries to repair',
        fixListHint: 'These rows are enabled but cannot be imported; they recover only after their dependency is installed, and are never shown as green.',
        constraintTitle: 'Key constraints',
        layerSection: 'Layer',
        docTitle: 'Document',
        docBytes: 'bytes',
        profileLabel: 'Profile',
        packagesLabel: 'packages',
        selfCheckOk: 'Self-check passed',
        selfCheckWarn: 'Self-check found problems',
        selfCheckUnavailable: 'Page self-check is unavailable in this environment',
        emptyDiagram: 'No layer structure found in the document; showing the full text instead.',
        parseError: 'Document parsing failed; showing the raw text',
        boundaryTitle: 'Panel failed to render',
        boundaryHint: 'Close and reopen the panel to retry; the content stays available through the arch_baseline tool.',
        liveError: 'Runtime data unavailable',
      },
    }

    const ICON_PATHS = {
      stack: ['M12 3 21 7.5 12 12 3 7.5Z', 'M3 12 12 16.5 21 12', 'M3 16.5 12 21 21 16.5'],
      folder: ['M3.5 7.5a2 2 0 0 1 2-2h3.2l2 2.2h7.8a2 2 0 0 1 2 2v8.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z'],
      plug: ['M9 3v4', 'M15 3v4', 'M7 7h10v4a5 5 0 0 1-10 0z', 'M12 16v5'],
      shield: ['M12 3.5 20 6v5.5c0 4.2-3.2 7.6-8 9-4.8-1.4-8-4.8-8-9V6z'],
      lock: ['M6 10h12v9H6z', 'M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10', 'M12 14v2'],
      memory: ['M7 7h10v10H7z', 'M10 3v4', 'M14 3v4', 'M10 17v4', 'M14 17v4', 'M3 10h4', 'M3 14h4', 'M17 10h4', 'M17 14h4'],
      globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18', 'M12 3c3.2 3.6 3.2 14.4 0 18'],
      search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'm16 16 5 5'],
      database: ['M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
      git: ['M6 21V6', 'M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', 'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', 'M6 16h5a3 3 0 0 0 3-3V9', 'M14 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
      browser: ['M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M3 9h18', 'M6.5 6.5h.01', 'M9 6.5h.01'],
      terminal: ['M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'm7 10 3 3-3 3', 'M12.5 16H17'],
      book: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z', 'M4 5.5v15'],
      spark: ['M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z'],
      route: ['M6 21V9a3 3 0 0 1 3-3h6', 'M6 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
      refresh: ['M20 12a8 8 0 1 1-2.3-5.6', 'M20 4v5h-5'],
      check: ['m5 12 5 5L20 7'],
      close: ['m6 6 12 12', 'm18 6-12 12'],
      external: ['M14 4h6v6', 'M20 4 11 13', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
      copy: ['M9 9h10v11H9z', 'M5 15V4h10'],
      chevron: ['m9 6 6 6-6 6'],
    }

    const SERVER_ICONS = [
      ['Filesystem', 'folder'],
      ['Memory', 'memory'],
      ['Fetch', 'globe'],
      ['Sequential', 'route'],
      ['SQLite', 'database'],
      ['PostgreSQL', 'database'],
      ['JSON Schema', 'code'],
      ['GitHub', 'git'],
      ['Puppeteer', 'browser'],
      ['Brave Search', 'search'],
      ['Context7', 'book'],
      ['Everything', 'search'],
      ['Desktop Commander', 'terminal'],
    ]

    // 文档组件名（规范名）→ 当前 profile 中实际承担该能力的模块（替换方案）
    const REPLACEMENT_ALIASES = {
      'dsh-memory': ['sage-mem'],
      'browser-skill-dsh-plugin': ['dsh-zcode-browser-use'],
      'dsh-skill-center': ['dsh-skill', 'dsh-skill-filesystem'],
      'dsh-ops': ['dsh-tools', 'dsh-sandbox-local', 'dsh-fs-sandbox'],
      'cc-safety-net': ['dsh-permission-presets'],
      'dsh-workbench-panel': ['dsh-workbench-templates'],
      'dsh-workbench-tools': ['dsh-workbench-templates'],
      'dshmarket': ['dsh-plugin-manager'],
      'dsh-agent-teams': ['dsh-experimental-agent-team'],
      'dsh-client-ui-skill-explorer': ['dsh-client-ui-skill'],
      'dsh-quota-nexus': ['dsh-cost-meter', 'dsh-deepseek-account-platform'],
      'dsh-archive-manager': ['dsh-session-persistence-jsonl'],
      'archify-dsh': ['dsh-mermaid'],
    }

    function serverKey(name) {
      for (let i = 0; i < SERVER_ICONS.length; i += 1) {
        if (name.indexOf(SERVER_ICONS[i][0]) !== -1) return SERVER_ICONS[i][0]
      }
      return name
    }

    function serverIcon(name) {
      const key = serverKey(name)
      for (let i = 0; i < SERVER_ICONS.length; i += 1) {
        if (SERVER_ICONS[i][0] === key) return SERVER_ICONS[i][1]
      }
      return 'plug'
    }

    function Icon(props) {
      const size = typeof props.size === 'number' ? props.size : 14
      const paths = ICON_PATHS[props.name] || ICON_PATHS.plug
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
          style: { display: 'block', flex: '0 0 auto' },
        },
        paths.map(function (d, index) {
          return h('path', {
            key: index,
            d: d,
            stroke: 'currentColor',
            strokeWidth: 1.7,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          })
        }),
      )
    }

    const CSS = [
      '.arch-panel{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);}',
      '.arch-header{display:flex;align-items:flex-start;gap:16px;justify-content:space-between;padding:14px 18px 10px;flex:0 0 auto;flex-wrap:wrap;}',
      '.arch-title{margin:0;font-size:16px;font-weight:600;line-height:1.4;}',
      '.arch-subtitle{margin:2px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.arch-header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.arch-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.arch-btn{font:inherit;font-size:12px;line-height:1;height:28px;padding:0 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:border-color .15s,background .15s;}',
      '.arch-btn:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);}',
      '.arch-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
      '.arch-btn[disabled]{opacity:.55;cursor:default;}',
      '.arch-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff;}',
      '.arch-toolbar{display:flex;align-items:center;gap:10px;padding:0 18px 10px;flex-wrap:wrap;flex:0 0 auto;border-bottom:1px solid var(--dsw-alias-border-l1);}',
      '.arch-tabs{display:inline-flex;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);}',
      '.arch-tab{font:inherit;font-size:12px;line-height:1;height:24px;padding:0 10px;border-radius:6px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;}',
      '.arch-tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;}',
      '.arch-tab-active{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.12);}',
      '.arch-search{position:relative;flex:1 1 200px;max-width:340px;display:flex;align-items:center;}',
      '.arch-search-input{width:100%;height:28px;box-sizing:border-box;font:inherit;font-size:12px;padding:0 26px 0 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);}',
      '.arch-search-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px rgba(64,144,255,.16);}',
      '.arch-search-clear{position:absolute;right:4px;width:20px;height:20px;border:none;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;}',
      '.arch-live{display:inline-flex;align-items:center;gap:8px;margin-left:auto;font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.arch-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:0 0 auto;}',
      '.arch-dot-ok{background:var(--dsw-alias-state-success-primary);}',
      '.arch-dot-warn{background:var(--dsw-alias-state-warn-primary);}',
      '.arch-dot-error{background:var(--dsw-alias-state-error-primary);}',
      '.arch-dot-absent{background:transparent;border:1px solid var(--dsw-alias-border-l2);}',
      '.arch-main{flex:1 1 auto;min-height:0;display:flex;}',
      '.arch-diagram{flex:1 1 auto;min-width:0;overflow:auto;padding:14px 18px;display:flex;flex-direction:column;gap:16px;}',
      '.arch-inspector{flex:0 0 300px;min-width:0;overflow:auto;border-left:1px solid var(--dsw-alias-border-l1);padding:14px;display:flex;flex-direction:column;gap:12px;background:var(--dsw-alias-bg-layer-1);}',
      '.arch-section{display:flex;flex-direction:column;gap:8px;}',
      '.arch-section-head{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);}',
      '.arch-section-actions{margin-left:auto;display:flex;gap:6px;align-items:center;}',
      '.arch-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;}',
      '.arch-subtabs{display:inline-flex;gap:2px;padding:2px;align-self:flex-start;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);}',
      '.arch-subtab{font:inherit;font-size:11.5px;line-height:1;height:24px;padding:0 10px;border-radius:6px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;}',
      '.arch-subtab:hover{color:var(--dsw-alias-label-primary);}',
      '.arch-subtab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;}',
      '.arch-subtab-active{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.12);}',
      '.arch-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 9px;background:var(--dsw-alias-bg-layer-1);min-width:0;}',
      '.arch-stat-value{font-size:16px;font-weight:650;line-height:1.15;}',
      '.arch-stat-label{margin-top:2px;font-size:10.5px;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:5px;}',
      '.arch-legend{display:flex;flex-wrap:wrap;gap:14px;font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.arch-legend-item{display:flex;align-items:center;gap:5px;}',
      '.arch-fixlist{display:flex;flex-direction:column;gap:3px;}',
      '.arch-update-row{display:flex;align-items:center;gap:6px;font-size:11px;}',
      '.arch-update-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.arch-update-ver{font-family:' + MONO + ';font-size:10px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.arch-fixrow{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.arch-layers{display:flex;flex-direction:column;gap:6px;}',
      '.arch-layer{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;transition:border-color .15s,box-shadow .15s;}',
      '.arch-layer:hover{border-color:var(--dsw-alias-border-l2);}',
      '.arch-layer-selected{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary);}',
      '.arch-layer-head{display:flex;align-items:center;gap:8px;width:100%;padding:6px 9px;background:transparent;border:none;cursor:pointer;font:inherit;color:inherit;text-align:left;}',
      '.arch-layer-head:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.arch-layer-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;}',
      '.arch-layer-badge{font-family:' + MONO + ';font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);flex:0 0 auto;}',
      '.arch-layer-name{font-size:12.5px;font-weight:600;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.arch-layer-meta{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;display:flex;align-items:center;gap:6px;}',
      '.arch-chevron{transition:transform .15s;color:var(--dsw-alias-label-secondary);display:flex;}',
      '.arch-chevron-open{transform:rotate(90deg);}',
      '.arch-chips{display:flex;flex-wrap:wrap;gap:4px;padding:0 9px 7px;}',
      '.arch-chip{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:10.5px;line-height:1.5;padding:1px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer;max-width:100%;}',
      '.arch-chip:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);}',
      '.arch-chip-selected{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);}',
      '.arch-chip-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;}',
      '.arch-mcp{display:flex;flex-direction:column;gap:8px;}',
      '.arch-tier{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;}',
      '.arch-tier-head{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:none;background:transparent;cursor:pointer;font:inherit;color:inherit;text-align:left;}',
      '.arch-tier-head:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.arch-tier-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;}',
      '.arch-tier-name{font-size:12px;font-weight:600;flex:1 1 auto;}',
      '.arch-tier-count{font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.arch-servers{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l1);}',
      '.arch-server{display:flex;align-items:center;gap:9px;padding:6px 10px;border:none;border-bottom:1px solid var(--dsw-alias-border-l1);background:transparent;cursor:pointer;font:inherit;color:inherit;text-align:left;}',
      '.arch-server:last-child{border-bottom:none;}',
      '.arch-server:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.arch-server:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px;}',
      '.arch-server-selected{background:var(--dsw-alias-bg-layer-2);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary);}',
      '.arch-server-icon{color:var(--dsw-alias-label-secondary);display:flex;flex:0 0 auto;}',
      '.arch-server-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px;}',
      '.arch-server-name{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.arch-server-role{font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.arch-transport{font-family:' + MONO + ';font-size:10px;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);flex:0 0 auto;}',
      '.arch-muted{color:var(--dsw-alias-label-secondary);font-size:12px;}',
      '.arch-empty{padding:16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;}',
      '.arch-pipeline{display:flex;flex-wrap:wrap;gap:6px;}',
      '.arch-pipe-step{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11px;color:var(--dsw-alias-label-secondary);max-width:100%;}',
      '.arch-pipe-num{font-size:10px;font-weight:700;color:var(--dsw-alias-brand-primary);}',
      '.arch-pipe-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;}',
      '.arch-inspector-title{font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;}',
      '.arch-inspector-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.55;}',
      '.arch-inspector-card{display:flex;flex-direction:column;gap:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px;background:var(--dsw-alias-bg-base);}',
      '.arch-kv{display:flex;gap:8px;font-size:11.5px;line-height:1.5;}',
      '.arch-kv-key{flex:0 0 62px;color:var(--dsw-alias-label-secondary);}',
      '.arch-kv-value{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;}',
      '.arch-actions-row{display:flex;flex-wrap:wrap;gap:6px;}',
      '.arch-constraint{display:flex;flex-wrap:wrap;gap:5px;}',
      '.arch-constraint-chip{font-size:10.5px;padding:1px 6px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}',
      '.arch-detail-pre{margin:0;max-height:200px;overflow:auto;padding:8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);font-family:' + MONO + ';font-size:11px;line-height:1.55;white-space:pre;}',
      '.arch-toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:5;pointer-events:none;font-size:11.5px;padding:6px 12px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 4px 14px rgba(0,0,0,.18);animation:arch-fadein .15s ease-out;}',
      '@keyframes arch-fadein{from{opacity:0}to{opacity:1}}',
      '.arch-notice{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:20px;border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:13px;}',
      '.arch-notice-error{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);}',
      '.arch-hint{margin:0;font-size:12px;color:var(--dsw-alias-state-warn-primary);}',
      '.arch-detail-line{margin:0;font-size:12px;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary);}',
      '.arch-doc{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:14px;padding:14px 18px;}',
      '.arch-nav{display:flex;flex-wrap:wrap;gap:6px;flex:0 0 auto;max-height:76px;overflow:auto;padding:0 18px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);}',
      '.arch-nav-label{font-size:11px;color:var(--dsw-alias-label-secondary);align-self:center;margin-right:2px;}',
      '.arch-nav-chip{font:inherit;font-size:12px;padding:2px 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;}',
      '.arch-nav-chip:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);}',
      '.arch-h{margin:0;line-height:1.45;}',
      '.arch-h2{font-size:19px;font-weight:650;margin-top:10px;padding-bottom:6px;border-bottom:1px solid var(--dsw-alias-border-l1);}',
      '.arch-h3{font-size:15.5px;font-weight:600;margin-top:8px;}',
      '.arch-h4{font-size:13.5px;font-weight:600;margin-top:4px;color:var(--dsw-alias-label-secondary);}',
      '.arch-p{margin:0;font-size:13.5px;line-height:1.75;}',
      '.arch-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px;font-size:13.5px;line-height:1.7;}',
      '.arch-quote{margin:0;padding:8px 12px;border-left:3px solid var(--dsw-alias-brand-primary);border-radius:0 6px 6px 0;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.7;}',
      '.arch-code{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;}',
      '.arch-code-lang{display:block;padding:5px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-family:' + MONO + ';font-size:11px;}',
      '.arch-code-pre{margin:0;padding:10px 12px;overflow:auto;font-family:' + MONO + ';font-size:12px;line-height:1.65;white-space:pre;}',
      '.arch-table-wrap{overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;}',
      '.arch-table{border-collapse:collapse;width:100%;font-size:12.5px;}',
      '.arch-table th,.arch-table td{border-bottom:1px solid var(--dsw-alias-border-l1);padding:6px 10px;text-align:left;vertical-align:top;line-height:1.6;}',
      '.arch-table th{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600;white-space:nowrap;}',
      '.arch-table tr:last-child td{border-bottom:none;}',
      '.arch-inline-code{font-family:' + MONO + ';font-size:12px;padding:1px 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);}',
      '.arch-hr{border:none;border-top:1px solid var(--dsw-alias-border-l1);margin:4px 0;width:100%;}',
      '.arch-doc-link{color:var(--dsw-alias-brand-primary);text-decoration:none;}',
      '.arch-doc-link:hover{text-decoration:underline;}',
      '@media (max-width:900px){.arch-main{flex-direction:column;}.arch-inspector{flex:1 1 auto;border-left:none;border-top:1px solid var(--dsw-alias-border-l1);max-height:46vh;}}',
    ].join('')

    function errorText(error) {
      if (!error) return 'unknown error'
      return error.message || String(error)
    }

    function normalizeName(value) {
      const text = String(value == null ? '' : value).toLowerCase().trim()
      const tail = text.split('/').pop() || text
      return tail.replace(/[^a-z0-9._-]/g, '')
    }

    function chipModuleName(item) {
      const text = String(item || '')
      const tokens = text.match(/@?[a-z0-9][a-z0-9._/-]*/gi) || []
      const ignored = ['ui', 'mcp', 'web', 'dsh', 'host', 'client']
      for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i]
        const lower = token.toLowerCase()
        if (ignored.indexOf(lower) !== -1) continue
        if (token.charAt(0) === '@' || token.indexOf('/') !== -1 || lower.indexOf('dsh') === 0 || lower.indexOf('-') !== -1) {
          return normalizeName(token)
        }
      }
      return ''
    }

    function buildLiveIndex(plugins) {
      const index = {}
      if (!Array.isArray(plugins)) return index
      for (let i = 0; i < plugins.length; i += 1) {
        const plugin = plugins[i]
        const key = normalizeName(plugin.moduleName)
        if (!key) continue
        const status = !plugin.enabled
          ? 'disabled'
          : plugin.phase === 'active'
            ? 'active'
            : plugin.phase === 'failed'
              ? 'failed'
              : plugin.phase
                ? 'pending'
                : 'broken'
        const previous = index[key]
        if (!previous || status === 'failed' || (status === 'active' && previous !== 'active')) index[key] = status
      }
      return index
    }

    function statusOf(index, item) {
      const key = chipModuleName(item)
      if (!key) return 'absent'
      const direct = index[key]
      if (direct) return direct
      const aliases = REPLACEMENT_ALIASES[key]
      if (aliases) {
        for (let i = 0; i < aliases.length; i += 1) {
          if (index[aliases[i]]) return index[aliases[i]]
        }
      }
      return 'absent'
    }

    function createText(locale) {
      if (locale && typeof locale.bind === 'function') {
        try {
          return locale.bind(NS)
        } catch (error) {
          /* fall through */
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

    // ---- markdown ----------------------------------------------------------

    function splitRow(line) {
      const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
      return trimmed.split('|').map((cell) => cell.trim())
    }

    function isTableSeparator(line) {
      return typeof line === 'string' && line.includes('|') && /^[\s|:-]*-{2,}[\s|:-]*$/.test(line)
    }

    function cleanText(text) {
      return String(text == null ? '' : text)
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    function stripNumbering(text) {
      return cleanText(text).replace(/^\d+(\.\d+)*\.?\s*/, '')
    }

    function truncate(text, max) {
      const value = cleanText(text)
      return value.length > max ? value.slice(0, max - 1) + '…' : value
    }

    function parseDocument(md) {
      const lines = md.replace(/\r\n/g, '\n').split('\n')
      const blocks = []
      let index = 0
      while (index < lines.length) {
        const line = lines[index]
        if (line.trim() === '') {
          index += 1
          continue
        }
        const fence = /^(`{3,}|~{3,})(.*)$/.exec(line)
        if (fence) {
          const marker = fence[1][0]
          const lang = fence[2].trim()
          const body = []
          index += 1
          while (index < lines.length && !lines[index].trim().startsWith(marker.repeat(fence[1].length))) {
            body.push(lines[index])
            index += 1
          }
          index += 1
          blocks.push({ kind: 'code', lang: lang, text: body.join('\n') })
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() })
          index += 1
          continue
        }
        if (/^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
          blocks.push({ kind: 'hr' })
          index += 1
          continue
        }
        if (line.trim().startsWith('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
          const header = splitRow(line)
          index += 2
          const rows = []
          while (index < lines.length && lines[index].trim().startsWith('|')) {
            rows.push(splitRow(lines[index]))
            index += 1
          }
          blocks.push({ kind: 'table', header: header, rows: rows })
          continue
        }
        if (/^\s*>/.test(line)) {
          const body = []
          while (index < lines.length && /^\s*>/.test(lines[index])) {
            body.push(lines[index].replace(/^\s*>\s?/, ''))
            index += 1
          }
          blocks.push({ kind: 'quote', text: body.join(' ') })
          continue
        }
        if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
          const ordered = /^\s*\d+\.\s+/.test(line)
          const items = []
          while (index < lines.length) {
            const current = lines[index]
            if (/^\s*([-*+]|\d+\.)\s+/.test(current)) {
              items.push(current.replace(/^\s*([-*+]|\d+\.)\s+/, '').trim())
              index += 1
              continue
            }
            if (current.trim() === '') break
            if (/^\s+\S/.test(current) && items.length > 0) {
              items[items.length - 1] += ' ' + current.trim()
              index += 1
              continue
            }
            break
          }
          blocks.push({ kind: 'list', ordered: ordered, items: items })
          continue
        }
        const paragraph = []
        while (index < lines.length) {
          const current = lines[index]
          if (current.trim() === '') break
          if (/^(#{1,6})\s+/.test(current)) break
          if (/^(`{3,}|~{3,})/.test(current)) break
          if (current.trim().startsWith('|')) break
          if (/^\s*>/.test(current)) break
          if (/^\s*([-*+]|\d+\.)\s+/.test(current)) break
          paragraph.push(current.trim())
          index += 1
        }
        if (paragraph.length === 0) {
          paragraph.push(line.trim())
          index += 1
        }
        blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
      }
      return blocks
    }

    function findH2Index(blocks, keyword) {
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i]
        if (block.kind === 'heading' && block.level === 2 && block.text.indexOf(keyword) !== -1) return i
      }
      return -1
    }

    function sectionEndIndex(blocks, startIndex) {
      for (let i = startIndex + 1; i < blocks.length; i += 1) {
        const block = blocks[i]
        if (block.kind === 'heading' && block.level <= 2) return i
      }
      return blocks.length
    }

    function extractLayers(blocks) {
      const start = findH2Index(blocks, '架构分层')
      if (start === -1) return []
      const end = sectionEndIndex(blocks, start)
      const layers = []
      let current = null
      for (let i = start + 1; i < end; i += 1) {
        const block = blocks[i]
        if (block.kind === 'heading') {
          if (block.level !== 3) continue
          const match = /^(L-MCP|L[0-4])\b[\s·:：]*(.*)$/.exec(block.text)
          if (match) {
            current = { code: match[1], title: cleanText(match[2]) || match[1], items: [], headingIndex: i }
            layers.push(current)
          } else {
            current = null
          }
          continue
        }
        if (!current) continue
        if (block.kind === 'code') {
          const body = block.text.split('\n')
          for (let j = 0; j < body.length; j += 1) {
            const item = cleanText(body[j])
            if (item && current.items.length < 14) current.items.push(item)
          }
        } else if (block.kind === 'list') {
          for (let j = 0; j < block.items.length; j += 1) {
            const item = cleanText(block.items[j])
            if (item && current.items.length < 14) current.items.push(item)
          }
        }
      }
      const rank = function (code) {
        return code === 'L-MCP' ? 10 : Number(code.slice(1))
      }
      layers.sort((left, right) => rank(right.code) - rank(left.code))
      return layers
    }

    function extractMcpTiers(blocks) {
      const start = findH2Index(blocks, 'MCP 服务器层')
      if (start === -1) return []
      const end = sectionEndIndex(blocks, start)
      const tiers = []
      let current = null
      for (let i = start + 1; i < end; i += 1) {
        const block = blocks[i]
        if (block.kind === 'heading') {
          if (block.level === 3) current = null
          if (block.level === 4) {
            const tierMatch = /(Tier\s*\d+[^\n]*)/.exec(cleanText(block.text))
            if (tierMatch) {
              current = { title: tierMatch[1], servers: [] }
              tiers.push(current)
            }
          }
          continue
        }
        if (!current || block.kind !== 'table') continue
        const header = block.header.map(cleanText)
        const serverIdx = header.findIndex((cell) => cell.indexOf('服务器') !== -1)
        const commandIdx = header.findIndex((cell) => cell.indexOf('包名') !== -1)
        const transportIdx = header.findIndex((cell) => cell.indexOf('传输') !== -1)
        const roleIdx = header.findIndex((cell) => cell.indexOf('职责') !== -1)
        for (let r = 0; r < block.rows.length; r += 1) {
          const cells = block.rows[r].map(cleanText)
          const name = cells[serverIdx >= 0 ? serverIdx : 1]
          if (!name) continue
          current.servers.push({
            name: name,
            command: commandIdx >= 0 ? cells[commandIdx] || '' : '',
            transport: transportIdx >= 0 ? cells[transportIdx] || '' : '',
            role: roleIdx >= 0 ? cells[roleIdx] || '' : cells[cells.length - 1] || '',
          })
        }
      }
      return tiers
    }

    function extractStartup(blocks) {
      const start = findH2Index(blocks, '启动契约')
      if (start === -1) return []
      const end = sectionEndIndex(blocks, start)
      for (let i = start + 1; i < end; i += 1) {
        const block = blocks[i]
        if (block.kind !== 'code' || block.text.indexOf('阶段 1') === -1) continue
        const stages = []
        const lines = block.text.split('\n')
        for (let j = 0; j < lines.length; j += 1) {
          const match = /^阶段\s*(\d+)：(.*)$/.exec(lines[j].trim())
          if (match) stages.push({ stage: Number(match[1]), text: cleanText(match[2]) })
        }
        if (stages.length > 0) return stages
      }
      return []
    }

    function extractConstraints(blocks) {
      const start = findH2Index(blocks, '最高优先级硬约束')
      if (start === -1) return []
      const end = sectionEndIndex(blocks, start)
      const chips = []
      for (let i = start + 1; i < end && chips.length < 8; i += 1) {
        const block = blocks[i]
        if (block.kind === 'heading' && block.level === 3) {
          const chip = stripNumbering(block.text)
          if (chip) chips.push(chip)
        }
      }
      return chips
    }

    function extractServerConfigs(blocks) {
      const start = findH2Index(blocks, 'MCP 服务器层')
      const configs = {}
      if (start === -1) return configs
      const end = sectionEndIndex(blocks, start)
      let heading = ''
      for (let i = start + 1; i < end; i += 1) {
        const block = blocks[i]
        if (block.kind === 'heading') {
          heading = cleanText(block.text)
          continue
        }
        if (block.kind !== 'code' || !heading) continue
        if (String(block.lang || '').toLowerCase() !== 'json') continue
        const key = serverKey(heading)
        const known = SERVER_ICONS.some((entry) => entry[0] === key)
        if (known && configs[key] === undefined) configs[key] = block.text
      }
      return configs
    }

    function detectVersion(blocks) {
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i]
        const text =
          block.kind === 'code' || block.kind === 'paragraph' || block.kind === 'quote' ? block.text : ''
        const match = /DSH Desktop[：:]\s*([\w.\-]+)/.exec(text)
        if (match) return match[1]
      }
      return ''
    }

    function isArchitectureDiagram(block) {
      return (
        block.kind === 'code' &&
        block.text.indexOf('L-MCP') !== -1 &&
        block.text.indexOf('宿主层') !== -1 &&
        (block.text.indexOf('┌') !== -1 || block.text.indexOf('│') !== -1)
      )
    }

    function renderInline(text, keyPrefix) {
      const nodes = []
      const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
      let cursor = 0
      let match
      let tokenIndex = 0
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
        const token = match[0]
        const key = keyPrefix + '-i' + tokenIndex
        tokenIndex += 1
        if (token.charAt(0) === '`') {
          nodes.push(h('code', { key: key, className: 'arch-inline-code' }, token.slice(1, -1)))
        } else if (token.slice(0, 2) === '**') {
          nodes.push(h('strong', { key: key }, token.slice(2, -2)))
        } else {
          const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
          nodes.push(
            h(
              'a',
              { key: key, className: 'arch-doc-link', href: link[2], target: '_blank', rel: 'noreferrer noopener' },
              link[1],
            ),
          )
        }
        cursor = match.index + token.length
      }
      if (cursor < text.length) nodes.push(text.slice(cursor))
      return nodes
    }

    function buildDocument(md) {
      try {
        const blocks = parseDocument(md)
        const layers = extractLayers(blocks)
        const tiers = extractMcpTiers(blocks)
        const startup = extractStartup(blocks)
        const constraints = extractConstraints(blocks)
        const serverConfigs = extractServerConfigs(blocks)
        const mcpIndex = findH2Index(blocks, 'MCP 服务器层')
        const headings = []
        for (let i = 0; i < blocks.length; i += 1) {
          const block = blocks[i]
          if (block.kind === 'heading' && block.level === 2) headings.push({ index: i, text: block.text })
        }
        for (let i = 0; i < layers.length; i += 1) {
          if (layers[i].code === 'L-MCP' && layers[i].items.length === 0 && tiers.length > 0) {
            layers[i].items = tiers.map((tier) => tier.title)
          }
        }
        let serverCount = 0
        for (let i = 0; i < tiers.length; i += 1) {
          const servers = tiers[i].servers
          for (let j = 0; j < servers.length; j += 1) {
            const key = serverKey(servers[j].name)
            servers[j].key = key
            servers[j].config = serverConfigs[key] || ''
            serverCount += 1
          }
        }
        return {
          status: 'ready',
          blocks: blocks,
          layers: layers,
          tiers: tiers,
          startup: startup,
          constraints: constraints,
          headings: headings,
          version: detectVersion(blocks),
          mcpIndex: mcpIndex,
          chars: md.length,
          lines: md.split('\n').length,
          stats: { layers: layers.length, servers: serverCount, stages: startup.length, sections: headings.length },
        }
      } catch (error) {
        return { status: 'fallback', blocks: [], layers: [], tiers: [], startup: [], constraints: [], headings: [], raw: md, error: errorText(error) }
      }
    }

    function dotClass(status) {
      if (status === 'active') return 'arch-dot arch-dot-ok'
      if (status === 'disabled') return 'arch-dot'
      if (status === 'failed' || status === 'broken') return 'arch-dot arch-dot-error'
      if (status === 'pending') return 'arch-dot arch-dot-warn'
      return 'arch-dot arch-dot-absent'
    }

    function statusKey(status) {
      if (status === 'active') return 'statusActive'
      if (status === 'disabled') return 'statusDisabled'
      if (status === 'failed') return 'statusFailed'
      if (status === 'broken') return 'statusBroken'
      if (status === 'pending') return 'statusPending'
      return 'statusAbsent'
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
          style: { display: 'block', color: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor' },
        },
        h('path', { d: 'M12 3.8 20.6 8.1 12 12.4 3.4 8.1Z', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        h('path', { d: 'M3.4 12 12 16.3 20.6 12', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.72 }),
        h('path', { d: 'M3.4 15.9 12 20.2 20.6 15.9', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.45 }),
      )
    }

    function collectDiagnostics() {
      if (typeof document === 'undefined' || !document.querySelector) return null
      try {
        const panel = document.querySelector('.arch-panel')
        const rect = panel ? panel.getBoundingClientRect() : null
        const style = panel && typeof getComputedStyle === 'function' ? getComputedStyle(panel) : null
        const rows = Array.prototype.slice.call(document.querySelectorAll('.arch-layer, .arch-server, .arch-chip'), 0, 200)
        let zero = 0
        for (let i = 0; i < rows.length; i += 1) {
          const box = rows[i].getBoundingClientRect()
          if (box.width < 2 || box.height < 2) zero += 1
        }
        return {
          at: new Date().toISOString(),
          viewport: { w: window.innerWidth, h: window.innerHeight },
          scheme:
            typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          panel: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
          panelBg: style ? style.backgroundColor : '',
          diagram: (function () {
            const diagram = document.querySelector('.arch-diagram')
            if (!diagram) return null
            return {
              clientHeight: diagram.clientHeight,
              scrollHeight: diagram.scrollHeight,
              scrollTop: diagram.scrollTop,
            }
          })(),
          counts: {
            layers: document.querySelectorAll('.arch-layer').length,
            chips: document.querySelectorAll('.arch-chip').length,
            servers: document.querySelectorAll('.arch-server').length,
            tabs: document.querySelectorAll('.arch-tab').length,
            buttons: document.querySelectorAll('.arch-btn').length,
            stats: document.querySelectorAll('.arch-stat').length,
            sections: document.querySelectorAll('.arch-section').length,
            zeroSize: zero,
          },
          updates: (function () {
            const inspector = document.querySelector('.arch-inspector')
            return {
              rows: document.querySelectorAll('.arch-update-row').length,
              text: inspector ? (inspector.innerText || '').replace(/\s+/g, ' ').slice(0, 400) : '',
            }
          })(),
          layerStates: (function () {            const result = []
            const nodes = document.querySelectorAll('.arch-layer')
            for (let i = 0; i < nodes.length && i < 12; i += 1) {
              const node = nodes[i]
              const badge = node.querySelector('.arch-layer-badge')
              const dot = node.querySelector('.arch-dot')
              const meta = node.querySelector('.arch-layer-meta')
              result.push({
                code: badge ? badge.textContent : '',
                dot: dot ? dot.className : '',
                green: dot ? dot.className.indexOf('arch-dot-ok') !== -1 : false,
                meta: meta ? meta.textContent : '',
              })
            }
            return result
          })(),
          text: (panel ? (panel.innerText || panel.textContent || '') : '').replace(/\s+/g, ' ').slice(0, 600),
        }
      } catch (error) {
        return { error: errorText(error) }
      }
    }

    function createPanel(t, locale, clientCtx) {
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
              { className: 'arch-panel' },
              h('style', null, CSS),
              h(
                'div',
                { className: 'arch-notice arch-notice-error' },
                h('p', { className: 'arch-detail-line' }, t('boundaryTitle') + '：' + errorText(this.state.error)),
                h('p', { className: 'arch-detail-line' }, t('boundaryHint')),
              ),
            )
          }
          return this.props.children
        }
      }

      function layoutService() {
        if (!clientCtx || typeof clientCtx.get !== 'function') return null
        try {
          return clientCtx.get('layout') || null
        } catch (error) {
          return null
        }
      }

      function renderBlock(block, index) {
        const key = 'b' + index
        if (block.kind === 'code') {
          if (isArchitectureDiagram(block)) return null
          return h(
            'div',
            { key: key, className: 'arch-code' },
            block.lang ? h('span', { className: 'arch-code-lang' }, block.lang) : null,
            h('pre', { className: 'arch-code-pre' }, block.text),
          )
        }
        if (block.kind === 'heading') {
          if (block.level === 1) return null
          return h(
            'h' + Math.min(block.level, 4),
            { key: key, className: 'arch-h arch-h' + block.level },
            renderInline(block.text, key),
          )
        }
        if (block.kind === 'paragraph') return h('p', { key: key, className: 'arch-p' }, renderInline(block.text, key))
        if (block.kind === 'quote') return h('blockquote', { key: key, className: 'arch-quote' }, renderInline(block.text, key))
        if (block.kind === 'list') {
          return h(
            block.ordered ? 'ol' : 'ul',
            { key: key, className: 'arch-list' },
            block.items.map(function (item, itemIndex) {
              return h('li', { key: key + '-' + itemIndex }, renderInline(item, key + '-' + itemIndex))
            }),
          )
        }
        if (block.kind === 'table') {
          return h(
            'div',
            { key: key, className: 'arch-table-wrap' },
            h(
              'table',
              { className: 'arch-table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  block.header.map(function (cell, cellIndex) {
                    return h('th', { key: key + '-h' + cellIndex }, renderInline(cell, key + '-h' + cellIndex))
                  }),
                ),
              ),
              h(
                'tbody',
                null,
                block.rows.map(function (row, rowIndex) {
                  return h(
                    'tr',
                    { key: key + '-r' + rowIndex },
                    row.map(function (cell, cellIndex) {
                      const cellKey = key + '-r' + rowIndex + '-c' + cellIndex
                      return h('td', { key: cellKey }, renderInline(cell, cellKey))
                    }),
                  )
                }),
              ),
            ),
          )
        }
        if (block.kind === 'hr') return h('hr', { key: key, className: 'arch-hr' })
        return null
      }

      function Panel() {
        useLocaleRevision(locale)
        const [state, setState] = React.useState({ status: 'loading' })
        const [timedOut, setTimedOut] = React.useState(false)
        const [tab, setTab] = React.useState('diagram')
        const [pendingJump, setPendingJump] = React.useState(-1)
        const [live, setLive] = React.useState({ status: 'loading' })
        const [selection, setSelection] = React.useState(null)
        const [collapsed, setCollapsed] = React.useState({})
        const [query, setQuery] = React.useState('')
        const [diagramView, setDiagramView] = React.useState('layers')
        const [toast, setToast] = React.useState('')
        const [updates, setUpdates] = React.useState({ status: 'idle' })
        const requestRef = React.useRef(0)
        const docScrollerRef = React.useRef(null)
        const toastTimerRef = React.useRef(0)
        const focusHandledRef = React.useRef(false)

        const showToast = function (message) {
          setToast(message)
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
          toastTimerRef.current = setTimeout(function () {
            setToast('')
          }, 2200)
        }

        const load = React.useCallback(function () {
          const id = requestRef.current + 1
          requestRef.current = id
          setState({ status: 'loading' })
          setTimedOut(false)
          fetch(DOC_ROUTE, { cache: 'no-store' })
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

        const loadLive = React.useCallback(function () {
          fetch(LIVE_ROUTE, { cache: 'no-store' })
            .then(function (response) {
              if (!response.ok) throw new Error('HTTP ' + response.status)
              return response.json()
            })
            .then(function (data) {
              setLive({ status: 'ready', data: data, at: Date.now() })
            })
            .catch(function (error) {
              setLive({ status: 'error', message: errorText(error) })
            })
        }, [])

        React.useEffect(function () {
          load()
        }, [load])

        const loadUpdates = React.useCallback(function (force) {
          setUpdates(function (previous) {
            return Object.assign({}, previous, { status: previous.status === 'ready' ? 'refreshing' : 'loading' })
          })
          fetch(UPDATES_ROUTE + (force ? '?refresh=1' : ''), { cache: 'no-store' })
            .then(function (response) {
              if (!response.ok) throw new Error('HTTP ' + response.status)
              return response.json()
            })
            .then(function (data) {
              setUpdates({ status: 'ready', data: data, upgrading: '' })
            })
            .catch(function (error) {
              setUpdates({ status: 'error', message: errorText(error) })
            })
        }, [])

        React.useEffect(function () {
          loadLive()
          const timer = setInterval(loadLive, LIVE_POLL_MS)
          return function () {
            clearInterval(timer)
          }
        }, [loadLive])

        React.useEffect(function () {
          loadUpdates(false)
          const timer = setInterval(function () {
            loadUpdates(false)
          }, 10 * 60 * 1000)
          return function () {
            clearInterval(timer)
          }
        }, [loadUpdates])

        React.useEffect(
          function () {
            if (state.status !== 'loading') return undefined
            const timer = setTimeout(function () {
              setTimedOut(true)
            }, LOAD_TIMEOUT_MS)
            return function () {
              clearTimeout(timer)
            }
          },
          [state.status],
        )

        React.useEffect(
          function () {
            if (tab !== 'text' || pendingJump < 0) return undefined
            const timer = setTimeout(function () {
              const scroller = docScrollerRef.current
              if (scroller) {
                const target = scroller.querySelector('[data-doc-block="' + pendingJump + '"]')
                if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              setPendingJump(-1)
            }, 0)
            return function () {
              clearTimeout(timer)
            }
          },
          [tab, pendingJump],
        )

        const liveData = live.status === 'ready' ? live.data : null
        React.useEffect(
          function () {
            if (!liveData || !liveData.focus) {
              focusHandledRef.current = false
              return
            }
            if (focusHandledRef.current) return
            focusHandledRef.current = true
            const layout = layoutService()
            if (layout && typeof layout.selectPanel === 'function') {
              try {
                layout.selectPanel('arch-baseline')
              } catch (error) {
                /* panel id may not be registered yet */
              }
            }
            if (liveData.view === 'mcp' || liveData.view === 'pipeline' || liveData.view === 'layers') {
              setDiagramView(liveData.view)
            }
            fetch(FOCUS_ACK_ROUTE, { method: 'POST' }).catch(function () {})
          },
          [liveData],
        )

        const doc = React.useMemo(
          function () {
            return state.status === 'ready' ? buildDocument(state.text) : null
          },
          [state.text],
        )
        const liveIndex = React.useMemo(
          function () {
            return liveData && liveData.plugins ? buildLiveIndex(liveData.plugins) : {}
          },
          [liveData],
        )

        const ready = state.status === 'ready' && doc && doc.status === 'ready'
        const canDiagram = ready && doc.layers.length > 0
        const showDiagram = canDiagram && tab === 'diagram'
        const mcpProtocolReady = liveIndex['dsh-mcp-resources'] === 'active'

        React.useEffect(
          function () {
            if (!ready || !showDiagram) return undefined
            const timer = setTimeout(function () {
              const payload = collectDiagnostics()
              if (!payload) return
              fetch(DIAGNOSTICS_ROUTE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              }).catch(function () {})
            }, 700)
            return function () {
              clearTimeout(timer)
            }
          },
          [ready, showDiagram],
        )

        const jumpToDoc = function (blockIndex) {
          if (typeof blockIndex !== 'number' || blockIndex < 0) return
          setTab('text')
          setPendingJump(blockIndex)
        }

        const toggleLayer = function (code) {
          setCollapsed(function (previous) {
            const next = Object.assign({}, previous)
            next[code] = !next[code]
            return next
          })
        }

        const openPlugins = function () {
          const layout = layoutService()
          if (layout && typeof layout.selectPanel === 'function') {
            try {
              layout.selectPanel('plugins')
              return
            } catch (error) {
              /* fall through to toast */
            }
          }
          showToast(t('liveError'))
        }

        const runSelfCheck = function () {
          const payload = collectDiagnostics()
          if (!payload) {
            showToast(t('selfCheckUnavailable'))
            return
          }
          fetch(DIAGNOSTICS_ROUTE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(function () {})
          const zero = payload.counts && payload.counts.zeroSize ? payload.counts.zeroSize : 0
          const blank = payload.panel && (payload.panel.w < 40 || payload.panel.h < 40)
          const ok = !zero && !blank && !payload.error
          showToast((ok ? t('selfCheckOk') : t('selfCheckWarn')) + ' · ' + (payload.counts ? payload.counts.layers + ' L / ' + payload.counts.chips + ' C / ' + payload.counts.servers + ' S' : ''))
        }

        const copyConfig = function (text) {
          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text).then(
              function () {
                showToast(t('copied'))
              },
              function () {
                showToast(t('copyFailed'))
              },
            )
            return
          }
          showToast(t('copyFailed'))
        }

        const upgradePlugin = function (bundle) {
          setUpdates(function (previous) {
            return Object.assign({}, previous, { upgrading: bundle.name })
          })
          fetch(UPGRADE_ROUTE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: bundle.name, version: bundle.latest }),
          })
            .then(function (response) {
              return response.json().then(function (body) {
                return { ok: response.ok, body: body }
              })
            })
            .then(function (result) {
              if (!result.ok) throw new Error((result.body && result.body.error) || 'upgrade failed')
              showToast(bundle.name + ' ' + bundle.version + ' → ' + bundle.latest + ' ' + t('upgradeOk'))
              load()
              loadLive()
              loadUpdates(true)
            })
            .catch(function (error) {
              showToast(t('upgradeFailed') + '：' + errorText(error))
              loadUpdates(true)
            })
        }

        // ---- derived: search filter ----
        const normalizedQuery = query.trim().toLowerCase()
        const matchesQuery = function (value) {
          if (!normalizedQuery) return true
          return String(value || '').toLowerCase().indexOf(normalizedQuery) !== -1
        }

        const visibleLayers = ready
          ? doc.layers
              .map(function (layer) {
                const chips = layer.items.filter(function (item) {
                  return matchesQuery(item) || matchesQuery(layer.title) || matchesQuery(layer.code)
                })
                return { layer: layer, chips: chips }
              })
              .filter(function (entry) {
                return entry.chips.length > 0 || matchesQuery(entry.layer.title) || matchesQuery(entry.layer.code)
              })
          : []

        const visibleTiers = ready
          ? doc.tiers
              .map(function (tier) {
                const servers = tier.servers.filter(function (server) {
                  return matchesQuery(server.name) || matchesQuery(server.role) || matchesQuery(server.transport) || matchesQuery(tier.title)
                })
                return { tier: tier, servers: servers }
              })
              .filter(function (entry) {
                return entry.servers.length > 0
              })
          : []

        const matchCount =
          visibleLayers.reduce(function (total, entry) {
            return total + entry.chips.length
          }, 0) + visibleTiers.reduce(function (total, entry) {
            return total + entry.servers.length
          }, 0)

        const liveCounts = liveData && liveData.counts ? liveData.counts : null

        // ---- sections ----
        const liveIssues = function () {
          const rows = []
          if (!liveData || !Array.isArray(liveData.plugins)) return rows
          for (let i = 0; i < liveData.plugins.length; i += 1) {
            const plugin = liveData.plugins[i]
            if (!plugin.enabled || plugin.phase === 'active') continue
            rows.push({ moduleName: plugin.moduleName, phase: plugin.phase || 'broken' })
            if (rows.length >= 8) break
          }
          return rows
        }

        const runtimeSection = function () {
          const issues = liveIssues()
          const cards = [
            { key: 'statTotal', value: liveCounts ? liveCounts.total : '—', status: '' },
            { key: 'statActive', value: liveCounts ? liveCounts.active : '—', status: 'ok' },
            { key: 'statAttention', value: issues.length, status: issues.length ? 'error' : '' },
            { key: 'statTools', value: liveData ? liveData.tools : '—', status: '' },
          ]
          return h(
            'div',
            { className: 'arch-section' },
            h(
              'div',
              { className: 'arch-section-head' },
              h(Icon, { name: 'refresh', size: 13 }),
              h('span', null, t('runtimeTitle')),
              h('span', { className: 'arch-section-actions' }, h('span', { className: 'arch-muted' }, liveData ? t('runtimeHint') : t('liveError'))),
            ),
            h(
              'div',
              { className: 'arch-stats' },
              cards.map(function (card) {
                return h(
                  'div',
                  { key: card.key, className: 'arch-stat', title: card.hint },
                  h('div', { className: 'arch-stat-value' }, String(card.value)),
                  h(
                    'div',
                    { className: 'arch-stat-label' },
                    card.status ? h('span', { className: 'arch-dot ' + (card.status === 'ok' ? 'arch-dot-ok' : card.status === 'warn' ? 'arch-dot-warn' : 'arch-dot-error') }) : null,
                    t(card.key),
                  ),
                )
              }),
            ),
            liveData
              ? h(
                  'div',
                  { className: 'arch-legend' },
                  h('span', { className: 'arch-legend-item' }, h('span', { className: 'arch-dot arch-dot-ok' }), t('legendRun') + ' ' + (liveCounts ? liveCounts.active : 0)),
                  h('span', { className: 'arch-legend-item', title: t('baselineNote') }, h('span', { className: 'arch-dot' }), t('baselineLegend') + ' ' + (liveCounts ? liveCounts.disabled : 0)),
                  h('span', { className: 'arch-legend-item' }, h('span', { className: 'arch-dot arch-dot-error' }), t('legendBroken') + ' ' + issues.length),
                )
              : null,
          )
        }

        const layersSection = function () {
          const allCollapsed = doc.layers.every(function (layer) {
            return collapsed[layer.code]
          })
          return h(
            'div',
            { className: 'arch-section' },
            h(
              'div',
              { className: 'arch-section-head' },
              h(Icon, { name: 'stack', size: 13 }),
              h('span', null, t('layersTitle')),
              h(
                'span',
                { className: 'arch-section-actions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'arch-btn',
                    onClick: function () {
                      setCollapsed(
                        allCollapsed
                          ? {}
                          : doc.layers.reduce(function (acc, layer) {
                              acc[layer.code] = true
                              return acc
                            }, {}),
                      )
                    },
                  },
                  allCollapsed ? t('expandAll') : t('collapseAll'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'arch-layers' },
              visibleLayers.map(function (entry) {
                const layer = entry.layer
                const open = !collapsed[layer.code] || !!normalizedQuery
                const layerStatusOf = function (item) {
                  if (layer.code === 'L0') return 'active'
                  if (layer.code === 'L4') return 'absent'
                  if (layer.code === 'L-MCP') return mcpProtocolReady ? 'active' : 'absent'
                  return statusOf(liveIndex, item)
                }
                const activeCount = entry.chips.filter(function (item) {
                  return layerStatusOf(item) === 'active'
                }).length
                const failedCount = entry.chips.filter(function (item) {
                  return layerStatusOf(item) === 'failed'
                }).length
                const selected = selection && selection.kind === 'layer' && selection.layer.code === layer.code
                return h(
                  'div',
                  { key: layer.code, className: 'arch-layer' + (selected ? ' arch-layer-selected' : '') },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'arch-layer-head',
                      onClick: function () {
                        setSelection({ kind: 'layer', layer: layer })
                        toggleLayer(layer.code)
                      },
                      'aria-expanded': open,
                    },
                    h('span', {
                      className: failedCount
                        ? 'arch-dot arch-dot-error'
                        : layer.code === 'L4'
                          ? 'arch-dot'
                          : activeCount > 0
                            ? 'arch-dot arch-dot-ok'
                            : 'arch-dot arch-dot-absent',
                    }),
                    h('span', { className: 'arch-layer-badge' }, layer.code),
                    h('span', { className: 'arch-layer-name' }, layer.title),
                    h(
                      'span',
                      { className: 'arch-layer-meta' },
                      layer.code === 'L0'
                        ? t('layerHostLive')
                        : layer.code === 'L4'
                          ? t('layerIsolated')
                          : layer.code === 'L-MCP'
                            ? t('layerProtocol') + ' · ' + activeCount + '/' + entry.chips.length
                            : entry.chips.length + ' ' + t('itemCount') + ' · ' + activeCount + ' ' + t('runningCount'),
                    ),
                    h('span', { className: 'arch-chevron' + (open ? ' arch-chevron-open' : '') }, h(Icon, { name: 'chevron', size: 11 })),
                  ),
                  open
                    ? h(
                        'div',
                        { className: 'arch-chips' },
                        entry.chips.map(function (item, index) {
                          const status = layerStatusOf(item)
                          const isSelected = selection && selection.kind === 'chip' && selection.layer.code === layer.code && selection.item === item
                          return h(
                            'button',
                            {
                              key: layer.code + '-' + index,
                              type: 'button',
                              className: 'arch-chip' + (isSelected ? ' arch-chip-selected' : ''),
                              onClick: function () {
                                setSelection({ kind: 'chip', layer: layer, item: item })
                              },
                              title: layer.code === 'L-MCP' ? item : t(statusKey(status)),
                            },
                            layer.code === 'L-MCP' ? null : h('span', { className: dotClass(status) }),
                            h('span', { className: 'arch-chip-name' }, truncate(item, 46)),
                          )
                        }),
                      )
                    : null,
                )
              }),
            ),
          )
        }

        const mcpSection = function () {
          return h(
            'div',
            { className: 'arch-section' },
            h('div', { className: 'arch-section-head' }, h(Icon, { name: 'plug', size: 13 }), h('span', null, t('mcpTitle'))),
            visibleLayers.length || visibleTiers.length
              ? null
              : h('div', { className: 'arch-empty' }, t('searchEmpty')),
            h(
              'div',
              { className: 'arch-mcp' },
              visibleTiers.map(function (entry) {
                const tier = entry.tier
                const open = !collapsed['tier:' + tier.title] || !!normalizedQuery
                return h(
                  'div',
                  { key: tier.title, className: 'arch-tier' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'arch-tier-head',
                      onClick: function () {
                        setCollapsed(function (previous) {
                          const next = Object.assign({}, previous)
                          next['tier:' + tier.title] = !next['tier:' + tier.title]
                          return next
                        })
                      },
                      'aria-expanded': open,
                    },
                    h('span', { className: 'arch-chevron' + (open ? ' arch-chevron-open' : '') }, h(Icon, { name: 'chevron', size: 11 })),
                    h('span', { className: 'arch-tier-name' }, tier.title),
                    h('span', { className: 'arch-tier-count' }, entry.servers.length + ' ' + t('packagesLabel')),
                  ),
                  open
                    ? h(
                        'div',
                        { className: 'arch-servers' },
                        entry.servers.map(function (server) {
                          const selected = selection && selection.kind === 'server' && selection.server.name === server.name
                          return h(
                            'button',
                            {
                              key: tier.title + '-' + server.name,
                              type: 'button',
                              className: 'arch-server' + (selected ? ' arch-server-selected' : ''),
                              onClick: function () {
                                setSelection({ kind: 'server', server: server })
                              },
                            },
                            h('span', { className: 'arch-server-icon' }, h(Icon, { name: serverIcon(server.name), size: 13 })),
                            h(
                              'span',
                              { className: 'arch-server-main' },
                              h('span', { className: 'arch-server-name' }, server.name),
                              h('span', { className: 'arch-server-role' }, truncate(server.role, 64)),
                            ),
                            server.transport ? h('span', { className: 'arch-transport' }, server.transport) : null,
                          )
                        }),
                      )
                    : null,
                )
              }),
            ),
          )
        }

        const pipelineSection = function () {
          if (!doc.startup.length) return null
          return h(
            'div',
            { className: 'arch-section' },
            h('div', { className: 'arch-section-head' }, h(Icon, { name: 'route', size: 13 }), h('span', null, t('pipelineTitle') + ' · ' + doc.startup.length)),
            h(
              'div',
              { className: 'arch-pipeline' },
              doc.startup.map(function (stage) {
                return h(
                  'span',
                  { key: stage.stage, className: 'arch-pipe-step' },
                  h('span', { className: 'arch-pipe-num' }, String(stage.stage)),
                  h('span', { className: 'arch-pipe-text' }, truncate(stage.text, 46)),
                )
              }),
            ),
          )
        }

        const inspector = function () {
          const head = function (title, icon) {
            return h('div', { className: 'arch-inspector-title' }, icon ? h(Icon, { name: icon, size: 14 }) : null, h('span', null, title))
          }
          const backButton =
            selection &&
            h('button', { type: 'button', className: 'arch-btn', onClick: function () { setSelection(null) } }, t('back'))

          if (!selection) {
            return h(
              'aside',
              { className: 'arch-inspector' },
              h('div', { className: 'arch-inspector-title' }, h(Icon, { name: 'memory', size: 14 }), h('span', null, t('inspectorTitle'))),
              h('div', { className: 'arch-inspector-sub' }, t('inspectorHint')),
              h(
                'div',
                { className: 'arch-inspector-card' },
                h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('statTotal')), h('span', { className: 'arch-kv-value' }, liveCounts ? liveCounts.total + ' · ' + (liveCounts.active + ' ' + t('statActive')) : '—')),
                h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('statTools')), h('span', { className: 'arch-kv-value' }, liveData ? String(liveData.tools) : '—')),
                h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('docTitle')), h('span', { className: 'arch-kv-value' }, doc.chars + ' ' + t('charsShort') + ' · ' + (liveData && liveData.doc ? liveData.doc.bytes : '—') + ' ' + t('docBytes'))),
                liveData && (liveData.profile || liveData.profileDir)
                  ? h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('profileLabel')), h('span', { className: 'arch-kv-value' }, liveData.profile || liveData.profileDir))
                  : null,
                h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('updatedAt')), h('span', { className: 'arch-kv-value' }, liveData ? new Date(liveData.at).toLocaleTimeString() : '—')),
              ),
              h(
                'div',
                { className: 'arch-actions-row' },
                h('button', { type: 'button', className: 'arch-btn arch-btn-primary', onClick: openPlugins }, h(Icon, { name: 'external', size: 12 }), t('openPlugins')),
                h('button', { type: 'button', className: 'arch-btn', onClick: runSelfCheck }, h(Icon, { name: 'check', size: 12 }), t('selfCheck')),
              ),
              updates.status !== 'idle'
                ? h(
                    'div',
                    { className: 'arch-inspector-card' },
                    h(
                      'div',
                      { className: 'arch-inspector-title' },
                      h(Icon, { name: 'refresh', size: 13 }),
                      h('span', null, t('updatesTitle')),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'arch-btn',
                          style: { marginLeft: 'auto' },
                          onClick: function () {
                            loadUpdates(true)
                          },
                          disabled: updates.status === 'loading' || updates.status === 'refreshing',
                        },
                        t('checkUpdates'),
                      ),
                    ),
                    updates.status === 'loading' || updates.status === 'refreshing'
                      ? h('p', { className: 'arch-inspector-sub' }, t('updatesChecking'))
                      : updates.status === 'error'
                        ? h('p', { className: 'arch-inspector-sub' }, t('upgradeFailed') + '：' + updates.message)
                        : (function () {
                            const list = (updates.data && updates.data.bundles) || []
                            const available = list.filter(function (row) {
                              return row.updateAvailable
                            })
                            if (available.length === 0) return h('p', { className: 'arch-inspector-sub' }, t('updatesUpToDate'))
                            return h(
                              'div',
                              { className: 'arch-fixlist' },
                              available.map(function (row) {
                                return h(
                                  'div',
                                  { key: row.name, className: 'arch-update-row' },
                                  h('span', { className: 'arch-update-name', title: row.name }, truncate(row.name, 26)),
                                  h('span', { className: 'arch-update-ver' }, row.version + ' → ' + row.latest),
                                  h(
                                    'button',
                                    {
                                      type: 'button',
                                      className: 'arch-btn',
                                      onClick: function () {
                                        upgradePlugin(row)
                                      },
                                      disabled: updates.upgrading === row.name,
                                    },
                                    updates.upgrading === row.name ? t('upgrading') : t('upgrade'),
                                  ),
                                )
                              }),
                            )
                          })(),
                    h('p', { className: 'arch-inspector-sub' }, t('updateHint')),
                  )
                : null,
              liveCounts && liveCounts.disabled
                ? h(
                    'div',
                    { className: 'arch-inspector-card', title: t('baselineNote') },
                    h('div', { className: 'arch-inspector-sub' }, t('baselineTitle') + ' · ' + liveCounts.disabled),
                    h('p', { className: 'arch-inspector-sub' }, t('baselineNote')),
                  )
                : null,
              liveIssues().length
                ? h(
                    'div',
                    { className: 'arch-inspector-card' },
                    h('div', { className: 'arch-inspector-sub' }, t('fixListTitle') + ' · ' + liveIssues().length),
                    h(
                      'div',
                      { className: 'arch-fixlist' },
                      liveIssues().map(function (issue) {
                        return h('div', { key: issue.moduleName, className: 'arch-fixrow' }, t('legendBroken') + ' · ' + truncate(issue.moduleName, 44))
                      }),
                    ),
                    h('p', { className: 'arch-inspector-sub' }, t('fixListHint')),
                  )
                : null,
              doc.constraints.length
                ? h(
                    'div',
                    { className: 'arch-inspector-card' },
                    h('div', { className: 'arch-inspector-sub' }, t('constraintTitle')),
                    h(
                      'div',
                      { className: 'arch-constraint' },
                      doc.constraints.map(function (chip) {
                        return h('span', { key: chip, className: 'arch-constraint-chip' }, chip)
                      }),
                    ),
                  )
                : null,
            )
          }

          if (selection.kind === 'layer') {
            const layer = selection.layer
            return h(
              'aside',
              { className: 'arch-inspector' },
              h('div', { className: 'arch-inspector-title' }, h(Icon, { name: 'stack', size: 14 }), h('span', null, layer.code + ' · ' + layer.title)),
              h('div', { className: 'arch-inspector-sub' }, layer.items.length + ' ' + t('itemCount')),
              h(
                'div',
                { className: 'arch-inspector-card' },
                h(
                  'div',
                  { className: 'arch-constraint' },
                  layer.items.map(function (item) {
                    const status = statusOf(liveIndex, item)
                    return h(
                      'span',
                      { key: item, className: 'arch-constraint-chip', title: t(statusKey(status)) },
                      h('span', { className: dotClass(status) }),
                      truncate(item, 30),
                    )
                  }),
                ),
              ),
              h('div', { className: 'arch-actions-row' }, backButton, layer.headingIndex >= 0 ? h('button', { type: 'button', className: 'arch-btn', onClick: function () { jumpToDoc(layer.headingIndex) } }, t('viewSection')) : null),
            )
          }

          if (selection.kind === 'chip') {
            const status = statusOf(liveIndex, selection.item)
            return h(
              'aside',
              { className: 'arch-inspector' },
              h('div', { className: 'arch-inspector-title' }, h(Icon, { name: 'plug', size: 14 }), h('span', { className: 'arch-chip-name' }, truncate(selection.item, 40))),
              h('div', { className: 'arch-inspector-sub' }, selection.layer.code + ' · ' + selection.layer.title),
              h(
                'div',
                { className: 'arch-inspector-card' },
                h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('statusLabel')), h('span', { className: 'arch-kv-value' }, h('span', { className: dotClass(status) }), ' ', t(statusKey(status)))),
                h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('layerSection')), h('span', { className: 'arch-kv-value' }, selection.layer.code)),
              ),
              h('div', { className: 'arch-actions-row' }, backButton, h('button', { type: 'button', className: 'arch-btn', onClick: function () { jumpToDoc(selection.layer.headingIndex) } }, t('viewSection'))),
            )
          }

          const server = selection.server
          return h(
            'aside',
            { className: 'arch-inspector' },
            h('div', { className: 'arch-inspector-title' }, h(Icon, { name: serverIcon(server.name), size: 14 }), h('span', null, server.name)),
            server.transport ? h('div', { className: 'arch-inspector-sub' }, h('span', { className: 'arch-transport' }, server.transport)) : null,
            h(
              'div',
              { className: 'arch-inspector-card' },
              server.command
                ? h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('commandLabel')), h('span', { className: 'arch-kv-value' }, h('code', { className: 'arch-inline-code' }, server.command)))
                : null,
              h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('roleLabel')), h('span', { className: 'arch-kv-value' }, server.role)),
              h('div', { className: 'arch-kv' }, h('span', { className: 'arch-kv-key' }, t('configLabel')), server.config ? null : h('span', { className: 'arch-kv-value' }, t('noConfig'))),
              server.config ? h('pre', { className: 'arch-detail-pre' }, server.config) : null,
            ),
            h(
              'div',
              { className: 'arch-actions-row' },
              backButton,
              server.config
                ? h('button', { type: 'button', className: 'arch-btn', onClick: function () { copyConfig(server.config) } }, h(Icon, { name: 'copy', size: 12 }), t('copyConfig'))
                : null,
              h('button', { type: 'button', className: 'arch-btn', onClick: function () { jumpToDoc(doc.mcpIndex) } }, t('viewSection')),
            ),
          )
        }

        const tabs = ready
          ? h(
              'div',
              { className: 'arch-tabs', role: 'tablist' },
              h(
                'button',
                {
                  type: 'button',
                  role: 'tab',
                  'aria-selected': showDiagram,
                  className: 'arch-tab' + (showDiagram ? ' arch-tab-active' : ''),
                  onClick: function () {
                    setTab('diagram')
                  },
                },
                t('tabDiagram'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  role: 'tab',
                  'aria-selected': !showDiagram,
                  className: 'arch-tab' + (!showDiagram ? ' arch-tab-active' : ''),
                  onClick: function () {
                    setTab('text')
                  },
                },
                t('tabText'),
              ),
            )
          : null

        const search = ready
          ? h(
              'div',
              { className: 'arch-search' },
              h('input', {
                className: 'arch-search-input',
                type: 'search',
                value: query,
                placeholder: t('searchPlaceholder'),
                'aria-label': t('searchPlaceholder'),
                onChange: function (event) {
                  setQuery(event.target.value)
                },
                onKeyDown: function (event) {
                  if (event.key === 'Escape') setQuery('')
                },
              }),
              query
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'arch-search-clear',
                      'aria-label': t('searchClear'),
                      onClick: function () {
                        setQuery('')
                      },
                    },
                    '✕',
                  )
                : null,
            )
          : null

        let body = null
        if (ready && showDiagram) {
          body = h(
            'div',
            { className: 'arch-main' },
            h(
              'div',
              { className: 'arch-diagram' },
              runtimeSection(),
              h(
                'div',
                { className: 'arch-subtabs' },
                [
                  ['layers', t('viewLayers')],
                  ['mcp', t('viewMcp')],
                  ['pipeline', t('viewPipeline')],
                ].map(function (item) {
                  return h(
                    'button',
                    {
                      key: item[0],
                      type: 'button',
                      className: 'arch-subtab' + (diagramView === item[0] ? ' arch-subtab-active' : ''),
                      onClick: function () {
                        setDiagramView(item[0])
                      },
                    },
                    item[1],
                  )
                }),
              ),
              diagramView === 'layers' ? layersSection() : diagramView === 'mcp' ? mcpSection() : pipelineSection(),
            ),
            inspector(),
          )
        } else if (ready) {
          body = h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' } },
            h(
              'div',
              { className: 'arch-nav' },
              h('span', { className: 'arch-nav-label' }, t('docTitle')),
              doc.headings.map(function (heading) {
                return h(
                  'button',
                  {
                    key: 'nav' + heading.index,
                    type: 'button',
                    className: 'arch-nav-chip',
                    onClick: function () {
                      jumpToDoc(heading.index)
                    },
                  },
                  heading.text,
                )
              }),
            ),
            h(
              'div',
              { className: 'arch-doc', ref: docScrollerRef },
              canDiagram ? null : h('p', { className: 'arch-hint' }, t('emptyDiagram')),
              doc.blocks.map(function (block, blockIndex) {
                if (block.kind === 'heading' && block.level >= 2 && block.level <= 3) {
                  return h('div', { key: 'h-' + blockIndex, 'data-doc-block': blockIndex }, renderBlock(block, blockIndex))
                }
                return renderBlock(block, blockIndex)
              }),
            ),
          )
        } else if (state.status === 'ready' && doc && doc.status === 'fallback') {
          body = h(
            'div',
            { className: 'arch-doc', ref: docScrollerRef },
            h('p', { className: 'arch-hint' }, t('parseError') + '：' + doc.error),
            h('pre', { className: 'arch-code-pre' }, doc.raw),
          )
        } else if (state.status === 'error') {
          body = h(
            'div',
            { className: 'arch-notice arch-notice-error' },
            h('p', { className: 'arch-detail-line' }, t('errorTitle') + '：' + state.message),
            h('button', { type: 'button', className: 'arch-btn', onClick: load }, t('retry')),
          )
        } else {
          body = h(
            'div',
            { className: 'arch-notice' },
            h('p', { className: 'arch-detail-line' }, t('loading')),
            timedOut ? h('p', { className: 'arch-hint' }, t('timeout')) : null,
            timedOut ? h('button', { type: 'button', className: 'arch-btn', onClick: load }, t('retry')) : null,
          )
        }

        return h(
          'div',
          { className: 'arch-panel' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'arch-header' },
            h(
              'div',
              null,
              h('h2', { className: 'arch-title' }, t('title')),
              h('p', { className: 'arch-subtitle' }, t('subtitle')),
            ),
            h(
              'div',
              { className: 'arch-header-actions' },
              ready ? h('span', { className: 'arch-meta' }, doc.chars + ' ' + t('charsShort') + ' · ' + doc.lines + ' ' + t('lines') + ' · ' + doc.stats.sections + ' ' + t('sections')) : null,
              liveData ? h('span', { className: 'arch-meta' }, (liveCounts ? liveCounts.active + '/' + liveCounts.total : '—') + ' · ' + t('updatedAt') + ' ' + new Date(liveData.at).toLocaleTimeString()) : null,
              h('button', { type: 'button', className: 'arch-btn', onClick: load, disabled: state.status === 'loading' }, h(Icon, { name: 'refresh', size: 12 }), t('refresh')),
              h('button', { type: 'button', className: 'arch-btn', onClick: loadLive }, h(Icon, { name: 'external', size: 12 }), t('refreshRuntime')),
            ),
          ),
          h(
            'div',
            { className: 'arch-toolbar' },
            tabs,
            search,
            h(
              'span',
              { className: 'arch-live' },
              h('span', { className: liveData ? (liveCounts && liveCounts.failed ? 'arch-dot arch-dot-error' : 'arch-dot arch-dot-ok') : 'arch-dot arch-dot-absent' }),
              liveData ? t('runtimeTitle') : t('liveError'),
              query ? h('span', { className: 'arch-meta' }, ' · ' + matchCount + ' ' + t('itemCount')) : null,
            ),
          ),
          body,
          toast ? h('div', { className: 'arch-toast', role: 'status' }, toast) : null,
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
        if (locale && typeof locale.register === 'function') {
          ctx.effect(() => locale.register(NS, 'zh', DICTS.zh))
          ctx.effect(() => locale.register(NS, 'en', DICTS.en))
        }
        const t = createText(locale)
        const PanelRoot = createPanel(t, locale, ctx)

        // 外部聚焦：无论面板是否挂载都轮询 Host，收到 focus 请求时把面板切到前台。
        const layoutOf = function () {
          try {
            if (ctx && typeof ctx.get === 'function') return ctx.get('layout') || null
          } catch (error) {
            /* layout unavailable */
          }
          return null
        }
        const pollFocus = function () {
          fetch(LIVE_ROUTE, { cache: 'no-store' })
            .then(function (response) {
              return response.ok ? response.json() : null
            })
            .then(function (data) {
              if (!data || !data.focus) return
              const layout = layoutOf()
              if (layout && typeof layout.selectPanel === 'function') {
                try {
                  layout.selectPanel('arch-baseline')
                } catch (error) {
                  /* panel id may not be registered yet */
                }
              }
              if (!data.view) fetch(FOCUS_ACK_ROUTE, { method: 'POST' }).catch(function () {})
            })
            .catch(function () {})
        }
        pollFocus()
        ctx.effect(function () {
          const timer = setInterval(pollFocus, LIVE_POLL_MS)
          return function () {
            clearInterval(timer)
          }
        })

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'arch-baseline',
              order: 35,
              label: () => t('title'),
            },
            SidebarIcon,
          ),
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'arch-baseline' }, PanelRoot),
        )
      },
    }
  },
})
