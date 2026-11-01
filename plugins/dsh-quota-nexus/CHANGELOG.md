# Changelog — dsh-quota-nexus

The nested bundle keeps its own version, independent of the root
`dsh-agi-federated` bundle (`plugins/dsh-quota-nexus/package.json`).

## 1.1.1 — 2026-11-01

- UI: the provider dialog now shows **both** protocols at once — the Base URL
  label reads “OpenAI 兼容协议 / Anthropic Messages 协议”, and two hint lines list
  the `Bearer` and `x-api-key + anthropic-version` shapes with the active one
  highlighted for the selected vendor.
- UI: the dialog header carries a `v1.1.1 · OpenAI + Anthropic` build badge, so a
  stale browser module is immediately recognizable instead of looking like a
  missing feature.
- UI: the local vendor is spelled out as `Ollama（本机 127.0.0.1:11434）`, and the
  local-discovery tab states its idle condition before the first scan.

## 1.1.0 — 2026-11-01

- Providers: add `custom-anthropic` — a user-supplied **Anthropic Messages**
  endpoint (`kind: anthropic-messages`) with a required `base_url`, so relay or
  self-hosted Claude-compatible gateways can be pooled beside the official
  vendor. Auth is `x-api-key` + `anthropic-version: 2023-06-01` (never `Bearer`).
- Probe: a `404`/`405` on `/models` now means "reachable but no probe endpoint"
  instead of a hard failure, so relays without a Models API validate cleanly;
  `401`/`403` still count as rejected credentials.
- Providers: `requiresBaseUrl()` generalizes the "must supply an endpoint" rule
  to every vendor that ships no default URL; the error code stays
  `quota_nexus_base_url_required`.
- UI: the provider dialog shows a protocol hint for Anthropic-family vendors
  (auth header shape + how far `base_url` should go), localized zh/en.
- UI: add the left-sidebar entry (`sidebar.panellist` id `quota-nexus`, order 5)
  plus its main panel (`main` key `quota-nexus`), sharing the live overview view
  with 设置 → 额度中枢.

## 1.0.0 — 2026-11-01

- Initial release: multi-provider credential pool (OpenAI-compatible, Anthropic,
  Gemini), O(1) in-memory lease scheduling with an 8-account budget and bounded
  100 ms queueing, split 429/5xx breakers with per-model cooldown and a 3-strike
  credential fuse, quota header ingestion with 95% soft switch / 5% pre-cool,
  80/90/95% alerts with inbox + webhook channels, write-behind usage ledger,
  read-only `quota_nexus_status` tool, loopback-only REST + SSE panel, and
  `D:\DeepSeek Harness\dsh-quota-nexus` persistence (0600 atomic writes).
