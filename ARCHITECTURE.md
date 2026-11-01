# dsh-agi-federated — Architecture Design

**Author:** txcdragon  
**Version:** 1.0.1  
**Target:** DeepSeek Harness `0.2.1-rc.5` (compatible range `>=0.2.1-rc.5 <0.3.0`)  
**License:** not declared by the package; choose one before public redistribution.

## 1. Executive summary

`dsh-agi-federated` is one Host plugin plus one dependency-free floating-window
script. It adds eight capabilities without changing the core Harness:

1. bounded Hot Memory with a byte-stable snapshot;
2. a Clue Store distilled by regular expressions and recalled with BM25;
3. deterministic surface-node checkpoint compaction;
4. staged skills promoted only after idle/session-end review;
5. a per-session evidence index and a five-step claim gate;
6. dual-channel token accounting with provider balance monitoring;
7. a hash-chained audit log for deny/ask decisions;
8. advisory JEPA, CUV, and mp-rcp federation seams.

The implementation is deliberately dependency-free at runtime. Every Harness
service is reached through `ctx.get(...)` and every filesystem, network, and
version comparison can fail closed or degrade without stopping the agent loop.
No memory, clue, evidence, or usage record stores the original transcript.

## 2. Design constraints

- **Four-file bundle.** The package is `package.json`, `cordis.patch.yml`,
  `schemas/config.js`, and `index.js`. Later documentation files (README and
  this document) are metadata, not runtime modules.
- **Mandatory persistence root.** All data paths are normalized under
  `D:\DeepSeek Harness`. A configured path outside that root is rejected and
  replaced by the default subdirectory.
- **No summarization model calls.** Memory distillation, BM25, compaction,
  skill review, and evidence matching are deterministic local operations.
- **Degrade, never block the loop.** Storage, balance APIs, compatibility
  checks, and federation seams are best effort. Only an explicit evidence deny,
  zero-trust deny, or budget breaker stops a gated operation.
- **The session log remains the source of truth.** Plugin state is a derived
  cache. Compaction is a logged surface replacement, not deletion of history.

## 3. Runtime topology

```text
                    ┌──────────────────────────────────────┐
                    │          DeepSeek Harness             │
                    │                                      │
  agent/created ───▶│  per-agent memory prompt section      │
  session/event ───▶│  memory fold + node-turn index        │
  tools/result  ───▶│  evidence index (max 400/session)     │
  tools/pre-execute ─│  evidence gate + zero trust + seams  │
  agent/stream  ───▶│  live token estimate (150 ms debounce)│
  llm/stream    ───▶│  raw provider usage parsers + breaker │
                    │                                      │
                    │  usage ledger  audit chain  skills     │
                    └───────────────┬──────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │  memory.json / evidence.json /       │
                 │  usage.json / checkpoints.json /     │
                 │  audit.jsonl / skills/{staged,...}   │
                 └──────────────────┬──────────────────┘
                                    │
                       ┌────────────┴────────────┐
                       │  /agi-federated/status  │
                       │  /agi-federated/client  │◀── floating window
                       └─────────────────────────┘
```

The floating window is injected by `webServer.tapIndex`, not by a second Client
file, so the original four-file lock still holds. The window polls the status
route from the Host memory cache and never computes a model request itself.

## 4. Component map

| Component | Location | Responsibility |
|---|---|---|
| `AgiFederated` | `index.js` | lifecycle, registration, orchestration, status |
| `JsonStore` | `index.js` | atomic JSON, append-only audit, path confinement |
| `AuditChain` | `index.js` | SHA-256 hash chain for every deny/ask |
| `UsageLedger` | `index.js` | monthly/session/provider token and cost folds |
| `EvidenceIndex` | `index.js` | 400-record per-session anchor index |
| `SkillStore` | `index.js` | staged write, deterministic review, promote |
| `FederationArbiter` | `index.js` | JEPA/CUV/mp-rcp advisory dispatch |
| `ProviderUsageTracker` | `index.js` | OpenAI, Anthropic, Gemini usage parsing |
| UI script | `UI_CLIENT_JS` string | drag/collapse/poll floating window |

## 5. Configuration contract

`schemas/config.js` exports a JSON Schema, immutable defaults, a normalizer, and
a validator. The normalizer is total: malformed input produces a valid
configuration rather than an activation failure.

Important invariants:

- `dataDir` is always under `D:\DeepSeek Harness`;
- arrays are replaced, not merged, when supplied;
- unknown numeric values are clamped to the schema range;
- `peerDependencies` are version ranges and are never rewritten at runtime;
- `gateMode` is exactly `enforce`, `ask`, or `observe`.

The complete schema is the source of truth for defaults. The patch file mirrors
the production defaults so a profile inspection shows the effective settings.

## 6. Memory subsystem

### 6.1 Hot Memory

Each session keeps at most 64 distilled records. A record contains:

```json
{
  "id": "m-<hash>",
  "sessionId": "session-...",
  "kind": "intent | outcome | tool-error | verification",
  "summary": "<= summaryMaxChars, redacted",
  "keywords": ["..."],
  "seedTokens": ["..."],
  "anchors": [{"kind": "path|url|version|measure|test|hash", "value": "..."}],
  "importance": 0,
  "seq": 0,
  "at": 0
}
```

Only `text` blocks are ingested. Hidden `reasoning` blocks and raw `tool-call`
arguments are excluded at the content extraction boundary, so a model's internal
reasoning and a shell command's credential never become memory.

The prompt snapshot is a pure function of the current records, the configured
limits, and the last query. It is sorted by `importance DESC, seq DESC, id ASC`,
rendered without timestamps, and cached by a monotonically increasing memory
revision. The same state always produces the same bytes.

The snapshot is registered as an agent-scoped prompt section named
`dsh-agi-federated.hot-memory`, so it dies with the agent scope.

### 6.2 Clue Store

The Clue Store is a map from record id to the same distilled fields. It never
stores the source text. Distillation performs:

1. code-fence removal;
2. secret redaction;
3. whitespace and sentence normalization;
4. bounded summary;
5. keyword frequency ranking;
6. seed-token extraction;
7. anchor extraction with regular expressions.

There are no model calls in this path.

### 6.3 BM25 recall

Documents are built from `keywords + seedTokens + summary`. The query is the
last user message plus hot-memory terms. The score is standard BM25:

```text
idf(t) = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
score  = Σ idf(t) * (tf * (k1 + 1)) /
         (tf + k1 * (1 - b + b * dl / avgdl))
```

`k1`, `b`, result count, and minimum score are configuration values. Results
are attached only as a bounded "long-tail recall" block. Excluded ids prevent
duplicating a hot record.

## 7. Context compaction

### 7.1 Trigger

Compaction is scheduled after `turn/end` or `agent/status=idle`, with a
configurable idle delay. It is skipped while the agent reports `running`.

### 7.2 Range selection

Surface nodes are ordered by `session.surface.nodes`. Each node is mapped to its
event type and turn. The algorithm:

1. discovers the maximum turn on the current surface;
2. computes `cutoff = maxTurn - keepRecentTurns + 1`;
3. walks from the head, skipping a protected system node at index 0;
4. stops at the first node at or after the cutoff, or at a later system node;
5. requires at least `minEvictNodes` candidates.

### 7.3 Replacement protocol

The replacement is a normal logged surface event, not log deletion:

```text
session.append('user/message', checkpointMessage, {
  surfaceOp: { op: 'replace', startSeq, endSeq },
  sourceEventSeqs: evictedSeqs
})
```

The replacement message is cloned from a real user message template, with a
fresh id, timestamp, content, and `{ kind: 'user' }` source. The content is a
constant-length ASCII placeholder:

```text
[AGI_CHECKPOINT v1 <start10>-<end10>] RETIRED-xxxx...
```

`placeholderLength` is clamped to `96..512` and padded to exactly that length.
The checkpoint metadata is persisted separately; the placeholder itself carries
no digest or variable-length payload.

The session surface now excludes the old messages from future model requests,
while the append-only log still contains them for replay, fork, and audit.

## 8. Skill lifecycle

```text
tool call → staged/*.json → idle / turn-end / session-end
          → deterministic review → promoted/*.json or rejected/*.json
```

`agi_skill_stage` only writes staged state. It never promotes. The review checks
name shape, minimum/maximum size, secret patterns, and forbidden placeholder
markers. A review does not call a model and cannot run from the stage call
itself. The tool API and the background timer are separate paths.

## 9. Evidence gate

### 9.1 Index

`tools/result` and durable `tool/result` events feed a per-session ring of at
most 400 records:

```json
{
  "tool": "bash",
  "level": "tested | measured | read_directly | prior_verified",
  "params": [{"kind": "path", "value": "..."}],
  "anchors": [{"kind": "test|measure|exit", "value": "..."}],
  "keywords": ["..."],
  "summary": "<= 180 chars"
}
```

The raw tool output is discarded after anchors and a summary are extracted.
Tool arguments are redacted before the pending-call map and again before any
evidence record is built; a credential pasted into a shell command is never
persisted in `evidence.json`.

### 9.2 Claim extraction

`write`/`edit` payloads are scanned line by line. Code-fenced and obvious code
lines are skipped. The scanner extracts paths, URLs, versions, test counts,
measurements, exit codes, and existence assertions.

### 9.3 Five-step ladder

For every claim:

1. **own session, exact anchor** → direct evidence level;
2. **own session, keyword overlap** → direct evidence level;
3. **other session, exact anchor** → `prior_verified`;
4. **existence baseline** → path exists, host/plugin version matches, or a
   zero exit code follows a recorded test;
5. **block**.

The final action depends on `gateMode`:

- `enforce` → deny before dispatch;
- `ask` → user approval;
- `observe` → allow and audit the observation.

The system prompt states the evidence vocabulary: `tested`, `measured`,
`read_directly`, `prior_verified` are direct; `documented` and
`community_practice` require a source; `assumption` requires an explicit label
and next verification step.

## 10. Usage and cost monitoring

### 10.1 Two channels

- **Estimate channel** — text/reasoning/tool-call character deltas are converted
  to tokens at `charsPerToken`. Publishing is debounced by 150 ms; continuous
  streaming therefore stays quiet between pauses.
- **Settlement channel** — `assistant/message` or `assistant/attempt` carries
  official `usage`; that replaces the estimate and is the value written to the
  ledger.

The live window shows the estimate; cost and totals use settled usage.

### 10.2 Provider parsers

The implementation includes all three required wire parsers:

| Provider | Input | Normalization |
|---|---|---|
| OpenAI | `usage.prompt_tokens`, `completion_tokens`, cached details | `normalizeTokenUsage` |
| Anthropic | `message_start.message.usage`, `message_delta.usage` | start/delta accumulator |
| Gemini | `usageMetadata.promptTokenCount`, `candidatesTokenCount`, cached/thought counts | `normalizeTokenUsage` |

`llm/stream` wraps every model stream, observes chunks, and caches raw usage by
session when no normalized usage is present.

### 10.3 Balance cache and breaker

A Host timer refreshes every provider once per second. Network calls are
aborted after 1.5 s and never block the UI. The status route reads only memory.

- DeepSeek account balance comes from `ctx.deepseekAccount.getBalance()`.
- A provider with a configured balance URL is queried generically.
- A provider without a balance interface runs in `spendOnly` mode: monthly spend
  is compared with its configured budget and the breaker opens at the next month
  boundary.
- A negative/zero balance or an explicit provider retry-after opens a cooldown.

`llm/stream` checks the breaker before dispatch. The floating window renders the
remaining cooldown with a 250 ms countdown tick.

## 11. Federation seams

`FederationArbiter` holds three optional handlers and three deterministic
default evaluators:

- **JEPA** — a 16-dimensional signed token-hash embedding and an energy/risk
  estimate; default allow.
- **CUV** — conflict, uncertainty, and value scores; default allow.
- **mp-rcp** — quorum/vote envelope; default allow.

Handlers run with a timeout. A timeout, exception, or missing handler returns
allow and is logged. A seam can deny only when explicitly configured as
`blocking`; otherwise a deny is advisory and still resolves to allow. This is a
side channel, not a gate on the agent loop.

## 12. Zero trust and audit

Federated mutations (`agi_skill_stage`, `agi_skill_review`) require a workspace
credential from the configured environment names or the credential service. A
missing credential denies the operation.

Every deny/ask path writes a record to `audit.jsonl`:

```json
{
  "seq": 1,
  "at": "2026-11-01T...",
  "kind": "deny",
  "subject": "write:evidence",
  "sessionId": "session-...",
  "reason": "...",
  "prev": "<previous hash>",
  "hash": "<sha256 of prev + canonical record>"
}
```

The chain is verified on load. A broken chain is surfaced in status; new records
continue from the last observed hash. The audit stores no raw payload.

## 13. Compatibility and self-upgrade

`package.json` declares peer dependencies as ranges. The runtime never edits
`package.json`, never rewrites a version, and never installs a package.

On startup `checkCompat()` reads the manifest, reads the Host release version
from `clientModules.graph().release.version`, and evaluates the ranges with a
local semver comparator. Failures append warnings and are surfaced in status,
but do not block activation or any tool.

## 14. UI

The floating window is a self-contained IIFE served from the Host:

- fixed-position panel, draggable by its header;
- theme tokens only (`--dsw-alias-*`), with safe literal fallbacks;
- collapse/close state in `sessionStorage`;
- drag position in `localStorage`;
- status poll interval supplied through the script query string;
- breaker countdown tick independent of polling;
- no iframe, no Harness Client package import, no `document.body` replacement.

The Host injects one external `<script defer>` tag through `tapIndex`. This keeps
the runtime to four files and avoids inline-script CSP issues.

## 15. Failure and degradation

| Failure | Behavior |
|---|---|
| persistence root unavailable | store enters degraded mode; memory/usage stay in memory; status exposes `degraded` |
| balance network error | status records the error; last known balance is cleared; UI remains responsive |
| token meter absent | local text heuristic is used |
| session projection absent | direct `session/event` fold is used |
| prompt service absent | memory/evidence prompt sections are skipped |
| tools/commands/webserver absent | corresponding registrations are skipped |
| federation handler timeout/error | allow, log a warning |
| malformed persisted JSON | rename to `.corrupt-<timestamp>`, use fallback |
| compaction failure | log and continue; no model call and no main-loop failure |
| audit disk failure | keep in-memory chain, mark chain broken |

## 16. Threat model

- **Prompt injection through memory** — memory records are summaries with
  redacted secrets, not raw model/tool output; they are bounded.
- **Transcript exfiltration** — clue/evidence stores contain summaries and
  anchors only; audit contains reasons only.
- **Malicious tool result** — evidence is advisory data; the gate never executes
  it.
- **Credential leakage** — secret regexes redact memory, audit, and skill
  staging; credentials are never persisted in plugin data.
- **Path traversal** — `JsonStore.resolve` rejects any target outside the
  persistence root.
- **Deny/ask tampering** — SHA-256 chain with `prev` linkage; verification runs
  on load.
- **Runaway spend** — provider month buckets and a pre-dispatch breaker for
  `spendOnly` routes.
- **Malicious federation handler** — timeout, exception containment, and
  default allow unless blocking is explicitly configured.

## 17. Verification matrix

| Area | Evidence |
|---|---|
| syntax | `node --check index.js`; `node --check schemas/config.js` |
| config | default path, forced-root rejection, schema key count |
| memory | snapshot header, distilled clue, BM25 result |
| compaction | 4-node replacement, placeholder exactly 160 chars |
| evidence gate | deny without evidence; allow after `12 tests passed` tool result |
| memory privacy | `contentText` omits `reasoning` and `tool-call`; explicit opt-in test passes |
| evidence privacy | tool arguments are redacted before the pending-call map |
| usage | 1000/500 official usage, DeepSeek cost 0.00082 USD |
| UI | injected script parses with `new Function`; route returns 200 |
| activation | `agi_status` returns `ok: true`, `degraded: false`; `/agi-federated/status` returns HTTP 200 |
| persistence | `memory.json`, `evidence.json`, `usage.json` created under the mandatory root |

## 18. Market listing copy

**Title:** AGI Federated — Memory, Evidence, and Cost Control for DeepSeek Harness  
**One line:** Bounded byte-stable memory, deterministic compaction, evidence-gated writes, and live token/balance control in one Host plugin.  
**Author:** txcdragon  
**Categories:** memory, context-management, observability, security

### Submission status

The DSH plugin market is a curated catalog served from
`awesome-dsh-plugin.com`; it has no direct upload endpoint. A listing is added
by a pull request to `awesome-dsh-plugin/awesome-dsh-plugin` with one registry
entry.

The plugin source is uploaded at:

```text
https://github.com/zyydragon-sys/dsh-agi-federated
```

Final attribution decision: the repository owner is `zyydragon-sys`, the author
and product brand remains `txcdragon`, and the catalog entry uses the actual
repository URL above.

The repository was created at 2026-11-01 17:41 Asia/Shanghai. The catalog
requires a repository at least one day old, so the directory pull request is
eligible from 2026-11-02 17:41 Asia/Shanghai. The prepared entry, README,
architecture document, and archive live under `market-submission-txcdragon/`.



