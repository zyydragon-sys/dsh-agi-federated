# Architecture evolution — selective adoption

This note records which parts of the four proposals were adopted, and which were
deliberately rejected because they would weaken the current guarantees.

## 1. One-click refresh

**Adopted:** a `刷新界面` button in the AGI panel. It calls
`window.location.reload()` only. Host sessions, running turns, and queued host
messages are not restarted by this button.

**Rejected:** a button that restarts the Host or reloads plugin modules while a
turn is running. That would race in-flight tool calls, duplicate queued work, and
discard unsaved drafts. A client reload is the safe subset; a true Host restart
belongs to the desktop shell's lifecycle, not to a status panel.

**Known limit:** browser-local unsaved composer text is not guaranteed to
survive a page reload. The button must not claim otherwise.

## 2. `/pua` retry and acceptance loop

**Adopted in principle:** after a failure, change the approach, and require
system-verified evidence before claiming completion. The existing evidence gate
already enforces the verification half for `write`/`edit`.

**Rejected as a default:** fifteen persona prompts, forced company-style role
play, and an unbounded acceptance loop. These add prompt weight and can hide a
failure behind style changes. An acceptance loop must be explicitly bounded by
the user or a command timeout.

**Not implemented in 1.4.0:** a slash command that injects a new turn. Command
injection needs an owner-scoped agent API and a cancellation contract; shipping
it as a UI-only message would be misleading.

## 3. White-box AGI

**Adopted:** deterministic self-checks over observable state — Host health,
audit-chain integrity, evidence-gate mode, memory bounds, model tracking, context
level, and pricing window. These are exposed as a `信任自检` card and a
`health` object in the status payload.

**Rejected:** autonomous self-modification, a hidden LLM judge as the source of
truth, and an unbounded world-model graph. A self-improvement loop must be
replayable from the session log and must fail closed at the evidence gate.

## 4. Evidence-first research

**Adopted:** the evidence ladder, anchors, a replayable per-session evidence
index, and independent verification for high-risk claims.

**Rejected:** a full domain ontology inside the hot path. Ontology growth needs
its own storage budget and a cold, inspectable projection; it must not inflate
the prompt or block the agent loop.

## Memory-bank adoption

Adopted from the Mnemon / learning-memory / OpenViking / Deja cluster:
local-first project isolation, knowledge pages, BM25 recall, auto-capture, and
graph links. Rejected: scraping 42 external agent session formats, remote
memory services, embeddings, and unbounded knowledge graphs. The bank is local
JSON, deterministic, redacted, and capped.

## Current implementation

- `1.4.0` adds the safe UI refresh button and the `信任自检` card.
- `1.3.0` added context occupancy levels, per-session model tracking, official
  DeepSeek Flash pricing, searchable memory/evidence/skills detail, and clickable
  cards.
- `1.2.0` added the clickable detail views and the on-demand `details=1`
  payload.
- `1.0.1` removed hidden reasoning and raw tool arguments from memory/evidence
  persistence.

## Pitfalls to keep out

1. Never reload the Host to apply a client change while a turn is running.
2. Never let an acceptance loop run without a hard iteration limit.
3. Never treat a self-audit as permission to mutate evidence or pricing.
4. Never make an ontology or world model a write authority for the session log.
5. Never call a fallback price "official"; unknown models must be labelled
   unpriced rather than silently charged at the generic rate.
