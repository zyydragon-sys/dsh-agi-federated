# dsh-agi-federated

**Author:** txcdragon  
**Version:** 1.5.2  
**Platform:** DeepSeek Harness Web (Host + `webServer` index tap)  
**Persistence:** `D:\DeepSeek Harness\agi-federated` (created automatically)

A federated AGI layer for DeepSeek Harness that combines bounded memory, deterministic context compaction, staged skill review, an evidence gate for factual claims, live token/cost observability, zero-trust audit, and advisory JEPA/CUV/mp-rcp seams.

## Bundled plugins

This repository ships more than one DSH bundle. The root is `dsh-agi-federated`; nested bundles live under `plugins/`.

| Path | Bundle | What it is |
|---|---|---|
| `/` | `dsh-agi-federated` | The federated AGI layer described below. |

| [`plugins/dsh-arch-01-baseline`](plugins/dsh-arch-01-baseline) | `dsh-arch-01-baseline` **v3.4.0** | DSH 架构基线工作台：实时运行时状态、分层/MCP/启动顺序可视化、检查器、版本检查与一键升级；单文件保存 ARCH-01 全文。 |
| [`plugins/dsh-workbench-templates`](plugins/dsh-workbench-templates) | `dsh-workbench-templates` **v4.0.0** | 多智能体工作台模板集 v3：Host SSE 实时看板、Team 成员与任务板、归档管理。 |

Publishing local edits to GitHub (no git needed on this machine):

```powershell
node scripts/publish.mjs --all
node scripts/publish.mjs --plugin dsh-quota-nexus
```

## What it does

- **Hot Memory** — a bounded, byte-stable prompt snapshot per session.
- **Clue Store + BM25** — regex-distilled summaries, keywords, seed tokens, and anchors; no transcript storage and no LLM calls.
- **Project Memory Bank** — local-first, project-scoped knowledge pages shared by sessions in the same working directory, with BM25 recall, tags, graph links, and explicit remember/search/get/reflect tools.
- **Surface checkpoint compaction** — old messages are removed from the model-visible surface with a constant-length `[AGI_CHECKPOINT]` node; no summarization model call.
- **Staged skills** — writes go to `staged/`; promotion is deferred to idle/session-end review.
- **Evidence gate** — every `write`/`edit` claim is cross-checked against a per-session index of tool parameter and output anchors (400 records), with a five-step false-positive ladder.
- **Usage monitor** — dual-channel token accounting (live estimate + official usage settlement), provider balance refresh every second, monthly-budget breaker for `spendOnly` providers, and a floating status window.
- **Context guard** — occupancy percentage with 45/60/80% warning levels, backed by the last settled request breakdown.
- **Model tracking** — the active provider/model follows `agent/request` and request-context changes, with a recent model-switch history in the panel.
- **Official cost** — DeepSeek Flash pricing from the API price table (off-peak/peak), with the last settled request breakdown shown in the panel.
- **Zero trust** — workspace credential required for federated mutations; every deny/ask is appended to a hash-chained audit log.
- **Federation seams** — JEPA world model, CUV value/conflict scorer, and mp-rcp quorum arbiter are mounted as advisory, default-allow seams.

## Left sidebar

After DSH is restarted and the page is refreshed, the plugin adds an **AGI** icon to the left
sidebar. Clicking it opens the installed-state panel: host/model, Hot Memory,
evidence index, skills, audit chain, federation seams, repository link, and the
pending market-PR milestone. The panel polls the same status route as the
floating window.
## Tools

| Tool | Purpose |
|---|---|
| `agi_status` | Model, session tokens, costs, provider balances, breaker countdown, evidence/skill counts, audit sequence. |
| `agi_memory_snapshot` | Exact bounded Hot Memory + BM25 injection text. |
| `agi_clue_search` | BM25 long-tail search over distilled clues. |
| `agi_memory_remember` | Save a project/global knowledge page (redacted, bounded, deduplicated). |
| `agi_memory_search` | BM25 search over project/global memory pages with graph links. |
| `agi_memory_get` | Read one page by id or best query match. |
| `agi_memory_reflect` | Deterministic duplicate merge; no model call. |
| `agi_evidence_query` | Query the evidence index by keyword or anchor. |
| `agi_skill_stage` | Stage a skill; never promotes immediately. |
| `agi_skill_list` | List staged/promoted/rejected skill metadata. |
| `agi_skill_review` | Schedule the background review. |
| `agi_federation_ping` | Probe JEPA/CUV/mp-rcp decisions. |

## Install

```powershell
# Recommended: install the bundle from this directory
dsh plugin --profile web add "D:\Deepseek宸ヤ綔鍖篭dsh-agi-federated"
dsh --profile web
```

Or use the DSH Plugin Manager's **Install bundle** with target:

```text
D:\Deepseek宸ヤ綔鍖篭dsh-agi-federated
```

For zero-trust skill writes, set a workspace credential before starting DSH:

```powershell
$env:DSH_AGI_WORKSPACE_TOKEN = "<your-workspace-token>"
```

After installation, refresh the Web page. The floating window is served from the plugin client route and reads the plugin status route.

## Persistence layout

```text
D:\DeepSeek Harness\agi-federated\
  memory.json          # bounded Hot Memory + distilled clues only
  evidence.json        # anchors and summaries, never raw tool output
  usage.json           # token/cost aggregates and monthly buckets
  checkpoints.json     # surface checkpoint metadata
  audit.jsonl          # hash-chained deny/ask records
  skills\
    staged\            # candidates awaiting idle review
    promoted\          # reviewed skills
    rejected\          # failed deterministic review
```

## Design document

The complete architecture is in [ARCHITECTURE.md](ARCHITECTURE.md): component boundaries, pure snapshot rules, BM25 formula, surface replacement protocol, evidence ladder, usage parsers, failure modes, threat model, and verification matrix. The selective-adoption record for the refresh, PUA, white-box AGI, and evidence-first research proposals is in [EVOLUTION.md](EVOLUTION.md).


