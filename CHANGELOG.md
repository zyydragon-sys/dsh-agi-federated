# Changelog

## 1.2.0 — 2026-11-01

- UI: clickable status cards open detail views for runtime/providers, Hot Memory,
  Clue Store, evidence, skills, audit chain, and federation seams.
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

