# Changelog

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

