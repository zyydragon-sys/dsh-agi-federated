# Changelog — dsh-quota-nexus

The nested bundle keeps its own version, independent of the root
`dsh-agi-federated` bundle (`plugins/dsh-quota-nexus/package.json`).

## 1.3.0 — 2026-11-01

- Balance: the pool now reads official **account balance**, not only rate-limit
  headers. DeepSeek ships the endpoint in the vendor catalog
  (`GET https://api.deepseek.com/user/balance`, documented at
  <https://api-docs.deepseek.com/api/get-user-balance/>); the parser reads
  `balance_infos[].total_balance` (currency, granted, topped up, `is_available`)
  and falls back to common flat shapes (`balance`, `data.total_balance`) so other
  vendors work by supplying a `balanceUrl`.
- Balance: `fetchBalance()` runs on every probe and right after add/update, keeps
  the last value in `state.json`, exposes it as `provider.balance`, and alerts
  when it falls to `alertBalanceFloor`. A failing balance endpoint only records a
  warning — it never demotes a healthy provider.
- UI: the card shows `余额 <CUR> <amount> · <time>`, and the dialog gains an
  optional 余额接口 URL field (empty = the vendor's official endpoint).
- Known limit: the MiniMax console page the operator supplied
  (<https://platform.minimax.cn/console/plan>) is an authenticated web UI, not a
  public API; MiniMax keeps no balance value until a `balanceUrl` is configured.

## 1.2.2 — 2026-11-01

- Quota: the card shows the last probe outcome (probe HTTP 404 (reachable) etc.), so a provider that reports no quota headers is distinguishable from one that was never probed.
- Quota: providerView exposes lastProbeStatus / lastProbeHttp.

## 1.2.1 — 2026-11-01

- Quota: probe responses now feed the quota meter. `probeRecord()` captures the
  `x-ratelimit-*` / `anthropic-ratelimit-*` / `retry-after` headers of the
  `/models` probe and `probe()` ingests them after the health reset, so a
  provider that reports quota only on probe traffic no longer stays at
  “尚未观测到额度响应头”.
- Quota: the card shows the observation time (`quotaObservedAt`) beside the
  percentage, and `providerView` exposes `lastProbeAt` for diagnostics.
- Quota: the empty-state text now names the exact headers it is waiting for
  instead of the vaguer “该账号尚未上报额度响应头”.

## 1.2.0 — 2026-11-01

- Providers: add an explicit **wire-protocol override** (`protocol`:
  `openai-compatible` | `anthropic-messages` | `gemini`) so one vendor can serve
  two protocols — e.g. a built-in DeepSeek or MiniMax entry pointed at its
  `/anthropic` endpoint now sends `x-api-key` + `anthropic-version` instead of
  `Bearer`, without switching to the custom vendor.
- Providers: when `protocol` is not set, it is inferred from the vendor kind and
  the `baseUrl` shape (`/anthropic` ⇒ Anthropic Messages); the card shows
  `<protocol> (auto)` so an inferred protocol is never silent. Explicit settings
  always win.
- Providers: probe/lease URLs tolerate a full endpoint pasted into `baseUrl`
  (`…/v1/messages` is reduced to `…/v1` before probing).
- UI: the dialog gains a 接口协议 selector (auto / OpenAI 兼容 / Anthropic
  Messages / Gemini) and the card row shows the effective protocol.

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
