# Changelog

## 1.6.9 — 2026-11-02

- **不崩盘闸门**：新增 `scripts/preflight.mjs`，发布前强制跑「语法 → 19 条自检 → 两个包的无头
  apply 装配 → profile 清单校验 → 客户端 5 个槽位渲染」。`publish.mjs` 默认执行该闸门，
  失败即中止发布；`--skip-preflight` 仅保留给明确知情的手工场景。
- `MAINTENANCE.md` 增加「不崩盘铁律」5 条（preflight、定时器必 catch、apply 不外抛、profile 自愈、
  四项验收口径）。
- 事故取证：崩溃日志显示 `web boot: 1 entry did not activate — dsh-agi-federated: loading`，
  DSH 随后把 profile 的 bundles 裁剪到 2 条，导致所有插件（含本插件）消失。
  已注册登录自愈项 `HKCU\...\Run\DSH-Profile-Guard` 指向 `profile-guard.mjs --fix --golden`。

## 1.6.8 — 2026-11-02

- 随包 `dsh-quota-nexus` 1.23.1：取证修正 + bundles 缩短检测（不自动回滚）。

## 1.6.7 — 2026-11-02

- 随包 `dsh-quota-nexus` 1.23.0：Host 内 profile 清单自愈（金样 + 留证 + 30s 复查）、
  两个只读 REST 端点、19 条自检。
- `scripts/profile-guard.mjs` 增强为可独立运行的同一套校验/修复逻辑（`--golden`、`--fix`、`--json`、
  `--profile`），用于安装前后与手工排查。

## 1.6.6 — 2026-11-02

- 新增 `scripts/profile-guard.mjs`：校验运行中 profile（`DSH_PROFILE_DIR`）的
  `dependencies` 与 `dsh.profile.bundles` 是否仍收录 `dsh-quota-nexus`，缺失时退出码 1，
  `--fix` 可补回。
- 事故背景（已复现取证）：profile 的 `package.json` 被外部 PowerShell 重写后带上 UTF-8 BOM、
  且 `link:` 路径里的中文变成乱码（`D:/Deepseek宸ヤ綔鍖?`），随后 Host 启动时该插件
  **整体未加载**——状态工具消失、`/quota-nexus/api/*` 返回 404、界面两个用量胶囊与设置页同时消失。
  恢复后 `node scripts/profile-guard.mjs` 通过，插件 build 回到 `v1.22.4`、REST `ok=true`。
- 技能归档补齐到 12 个（新增 skill-center 的九个领域技能），`skills-sync --check` 通过。

## 1.6.5 — 2026-11-01

- 随包 `dsh-quota-nexus` 1.22.4：修复 Host 启动顺序导致 REST 面板永久缺失的问题
  （webServer 拿不到时每 2s 重试注册），客户端在接口不可用时渲染红色不可用胶囊而不是空白。

## 1.6.4 — 2026-11-01

- 随包 `dsh-quota-nexus` 1.22.3：轮转遇到宿主 HMR 嵌套事务时标记可重试并 2 秒后重试一次，
  并把错误时间写进 `overview.rotation.lastErrorAt`（避免旧错误看起来像刚发生）。

## 1.6.3 — 2026-11-01

- 项目级技能纳入版本化：新增 `skills/` 目录与 `skills/README.md`，收录
  `dsh-stale-edit-recovery`、`darwin-fix-1f205770`、`darwin-llm-retry-loop` 三个
  `SKILL.md`。活动挂载仍在 `<workspace>/.dsh/skills`（DSH 从这里热加载），
  `skills/` 是单向镜像。
- 新增 `scripts/skills-sync.mjs`：`--check`（CI 友好，漂移退出码 1）、`--list`（JSON 差异），
  默认镜像；只做 挂载 → 仓库 单向写入，仓库独有文件只报告不删除。
- 修正 `darwin-llm-retry-loop` 的 `whenToUse`：原值为 stale-edit 文案（模板串味），
  已改成“同一回合反复出现 llm/retry 或 429/额度/上下文导致连续失败时”。
- `publish.mjs` 增加 `skills` 分组，发布时随包推送。

## 1.6.2 — 2026-11-01

- CI 红灯不再自生自灭：新增 `file-ticket` job（`needs: [selftest, drift]`、`if: failure()`），
  用 `actions/github-script` 按标题去重地开/追加一张带 `darwin-ticket` 标签的 issue，正文含
  分支、提交、运行链接与本地复现命令。只会开工单，**绝不会自动晋级技能**。
- 新增 `scripts/ci-doctor.mjs`：把 `darwin-ticket` issue 拉回本地（分支/提交/运行/复现命令），
  支持 `--json`、`--write-inbox`（写到 workspace 的 `.dsh/ci-inbox.json`，不污染 drift）、
  `--fixture` 离线解析。缺 token 时直接报错而不是静默返回空列表。
- 处置链路固定为人工闸门：`darwin_scan → darwin_forge → darwin_eval`（P2 门 ≥80%）
  → 人工 `darwin_promote {confirm:true}` → 可用 `darwin_rollback` 回滚。

## 1.6.1 — 2026-11-01

- CI self-test now runs on a three-OS matrix (`ubuntu-latest`, `windows-latest`,
  `macos-latest`) with `fail-fast: false`, so the plugin is checked on the platform it
  actually ships on instead of Linux only.
- CI gains a `drift` job: on push/manual runs it executes `scripts/monitor.mjs` with the
  Actions `GITHUB_TOKEN` and fails when the checked-out tree differs from GitHub.
  Skipped on `pull_request` because a fork token cannot read the upstream tree.
- Validated locally by simulating a clean checkout (28 files, no `node_modules`, no
  `.git`): the job correctly reported `DRIFT .github/workflows/ci.yml` before this
  publish and again `OK — repository matches local source` after it.

## 1.6.0 — 2026-11-01

- Bundle version now tracks the packaged plugin releases again; this entry covers
  `dsh-quota-nexus` 1.22.2 (top usage strip, sidebar-foot usage capsule, version
  self-heal, real session usage import in CNY, capability-aware rotation with an
  idle guard) plus the packaging metadata added along the way (`engines`, optional
  peers, `npm test`).
- CI: add `.github/workflows/ci.yml` running `node --check` on every host/client
  entry, a manifest JSON check, and the plugin's 16-assertion self-test on Node 20 —
  no `npm install`, so it stays green without third-party deps.
- `files` now also ships `plugins/**` and `scripts/**`.

## 1.5.2 — 2026-11-01

- Fix blank AGI panel on first render: guard the Project Memory count until
  the first status payload arrives. The previous `data.memory` access threw
  while `data` was still null, so the whole main panel component crashed.

## 1.5.1 — 2026-11-01

- Fix startup activation: declare `tools` as a required injection and acquire
  `webServer` through `ctx.inject`, so the Host plugin registers tools and the
  status route even when those services appear after plugin apply.

## 1.5.0 — 2026-11-01

- Memory: add a local-first, project-scoped memory bank shared by sessions in
  the same working directory; global pages are opt-in.
- Memory: add `agi_memory_remember`, `agi_memory_search`, `agi_memory_get`, and
  `agi_memory_reflect`; BM25 recall, deduplication, bounded pages, and graph links.
- Memory: auto-capture tool-error lessons and explicit "remember" intents; inject
  bounded project-memory recall into the prompt.
- UI: Project Memory is listed in the memory card, detailed page, and search.

## 1.4.0 — 2026-11-01

- UI: add a safe `刷新界面` button (client reload only; no Host restart).
- UI: add a `信任自检` card and `health` status object for white-box invariants.
- Docs: add `EVOLUTION.md` with selective adoption and rejected pitfalls from the
  refresh, PUA, white-box AGI, and evidence-first research proposals.

## 1.3.0 — 2026-11-01

- Context: show occupancy percentage and 45/60/80% warning levels in the card
  and runtime detail; use the last settled request as the displayed baseline.
- Detail: search filters for memory clues, evidence records, and skills.
- Models: track effective provider/model per session and keep a recent switch
  history so a model change does not leave the card stuck on DeepSeek.

## 1.2.0 — 2026-11-01

- Pricing: use the official DeepSeek Flash off-peak/peak rates and recompute
  historical usage; the previous fallback priced cache reads at the generic $0.50
  rate and overstated the session by roughly 80x.
- UI: the context card is labeled as the last settled request and its detail
  view exposes input/cache/output tokens and the active pricing window.
- UI: clickable status cards open detail views for runtime/providers, Hot Memory,
  Clue Store, evidence, skills, audit chain, and federation seams.
- Models: track the effective provider/model per session from agent/request,
  request/header, request/context, stream, and assistant events; the runtime
  detail keeps a recent switch history instead of showing only DeepSeek.
- Host: `status?details=1` returns bounded memory/evidence/skills details on
  demand; the default status payload stays compact.

## 1.1.0 — 2026-11-01

- UI: add the left-sidebar AGI panel (`sidebar.panellist` + `main`) with live
  installation, memory, evidence, audit, federation, and market status.
- UI: add localized plugin metadata (`locale/en.json`, `locale/zh.json`) and an
  original `icon.svg` for the Plugin Manager inventory.

## 1.0.1 — 2026-11-01

- Security: exclude hidden `reasoning` blocks and raw `tool-call` arguments from
  Hot Memory and clue distillation.
- Security: redact tool arguments before the evidence pending-call map and again
  on evidence hydration, so a credential in a shell command is never persisted.
- Maintenance: add `scripts/publish.mjs`, `scripts/monitor.mjs`, and this
  changelog; document the version and publication workflow.
- Documentation: record the attribution decision (repository owner
  `zyydragon-sys`, author `txcdragon`).

## 1.0.0 — 2026-11-01

- Initial federated AGI layer: bounded Hot Memory, Clue Store + BM25,
  deterministic surface checkpoint compaction, staged skills, evidence gate,
  usage/balance monitor, zero-trust audit, and advisory JEPA/CUV/mp-rcp seams.

