# Changelog — dsh-quota-nexus

The nested bundle keeps its own version, independent of the root
`dsh-agi-federated` bundle (`plugins/dsh-quota-nexus/package.json`).

## 1.9.0 — 2026-11-01

- Plan windows: a subscription can declare multiple quota windows (e.g. `5h` and
  `week`), matching the vendor console layout: each window renders its own bar,
  `总额度 / 已用 %` and a live reset countdown (“4 小时 59 分后重置”). Usage per
  window is computed from a bounded local event ring, so windows roll by themselves.
- Usage details: `GET /api/usage?range=day|week|month` aggregates the event ring into
  totals (requests, tokens, active days, peak day), per-model breakdown and hourly/
  daily buckets. The panel shows 当日 / 近 7 天 / 近 30 天 bars per provider, and an
  explicit empty state when no call has gone through the plugin yet.
- Header drill-down: every stat chip (0s 实时, providers, 轮转 N 家, active, cooldown,
  re-login, ledger) is now a button that expands a detail panel — pool path, strategy,
  ledger counters, per-provider rows, active/cooling/re-login accounts and the model
  rotation plan.

## 1.8.0 — 2026-11-01

- Cross-provider rotation: `selectModel()` now cycles across providers instead of
  always returning the first candidate — repeated `quick` calls alternate
  DeepSeek → MiniMax → DeepSeek, spreading consumption across accounts.
  Verified live: call 1 `deepseek-flash` (next MiniMax), call 2
  `MiniMax-M3.1-Flash` (next DeepSeek).
- Rotation only considers *available* candidates (cooling / quota / fuse states are
  skipped); `strategy: "balanced"` picks the least-recently-used provider instead of
  a fixed order, and `providerId` pins selection to one provider without rotation.
- Responses now report `strategy`, `rotationSize` and
  `decision.rotation { index, total, next }`; the tool schema documents both
  strategies.
- UI: the header shows “轮转 N 家供应商” when more than one provider is routable.

## 1.7.0 — 2026-11-01

- Auto model routing: `selectModel({ task })` maps a task class to the模型/账号
  that fits it — `quick` prefers the cheap tier to save quota, `code`/`reasoning`
  prefer the strong tier, `long` prefers the largest context window, `vision`
  prefers a multimodal id. Classification is heuristic (model id/name + context
  window from the official catalog) and every decision reports `source: auto|policy`.
- Explicit overrides: `provider.modelPolicy = { quick, code, reasoning, long, vision }`
  wins over the heuristic; settable through `POST /api/providers/edit`.
- Read-only decision tool `quota_nexus_select_model` (task class → model + provider
  with availability, balance and block reason) so an Agent can ask before spending
  tokens. No upstream request is made and no quota is consumed.
- API/UI: `POST /api/models/select`, and each card renders
  “自动切换 quick→… · code→… · reasoning→…”.

## 1.6.0 — 2026-11-01

- 0s live balances: a fast refresh loop (`balanceRefreshMs`, default 5000, min
  1000) re-reads each vendor balance endpoint and pushes every result over SSE,
  so an open panel updates without a page refresh. Per-account in-flight guard plus
  an 800 ms floor prevent hammering the vendor API; the UI also fires
  `POST /api/providers/refresh` on mount.
- 0s countdowns: the client ticks once per second locally, so the reset countdown
  and plan window advance smoothly between pushes (no extra requests).
- Plan mode: a provider can declare `plan: { kind: "payg" | "subscription", limit,
  unit, periodMs }`. Subscription windows roll on `anchorAt + n*periodMs`, reset the
  local counter, and render “套餐：订阅 · used/limit · 剩余 · 重置 Ns”; pay-as-you-go
  renders “套餐：按量计费”. Numbers come from declared limits + locally observed
  usage (or official headers when the vendor sends them) — never invented.
- UI: `0s 实时` chip with the last snapshot time, plan line per card, and plan
  controls (type / limit / daily-weekly-monthly) in the provider dialog.

## 1.5.0 — 2026-11-01

- Models: `syncModels()` pulls the vendor’s official catalog and replaces the
  hardcoded list, keeping `modelMeta` (display name, context window, max output)
  and `modelsSyncedAt`. Verified against both live endpoints:
  `GET https://api.deepseek.com/models` → 200 (`data[].id`, e.g. `deepseek-flash`),
  `GET https://api.minimax.cn/anthropic/v1/models` → 200 (`data[].id`, `display_name`).
  DeepSeek’s `/anthropic` base has no Models API (404), so the catalog carries an
  explicit `modelsUrl`; other vendors fall back to `<base>/models`.
- Usage: per-account window counters (`requests`, `tokens`) plus the reset
  countdown taken from the official `x-ratelimit-reset-*` / `retry-after` headers,
  shown as “本周期 N 次请求 · M tokens · 重置倒计时 …”. Local counters are the
  fallback when a vendor advertises no quota headers — never invented numbers.
- API/UI: `POST /api/providers/sync-models` (`{id}` or none for all), a per-card
  “同步模型” button, a models line with count and synced time, and the usage line
  on every card.

## 1.4.0 — 2026-11-01

- UI: each provider card carries its official **top-up entry** (plus the usage page
  when the vendor publishes one): DeepSeek `https://platform.deepseek.com/top_up` and
  `https://platform.deepseek.com/usage`; MiniMax `https://platform.minimax.cn/console/plan`.
  Links open in a new tab with `rel="noopener noreferrer"`.
- Providers: `providerView` exposes `rechargeUrl` / `usageUrl`; both can be overridden
  per provider, with the vendor catalog supplying the defaults.

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
