# Phase 4 — Agent runner (Claude Agent SDK)

**Theme:** Run real agent sessions: map profiles to SDK options, streaming-input query, persist the full chat catalog, bridge user input, Query controls, and open a PR on success.

**Depends on:** Phase 1, Phase 2, Phase 3

**Exit criteria:** A session can be created and run end to end against a cloned workspace using **streaming-input** `query()`; every catalog `SDKMessage` persists and streams; `canUseTool` / elicitation block until REST resolves them (including multi-question AskUserQuestion and concurrent `requestId`s); Query controls (interrupt, model/mode, rewind, MCP, stopTask) work; a successful run with changes opens a PR; runs survive SSE reconnect; the SDK is injected and mocked in tests.

Reference: agent runner in [`../architecture.md`](../architecture.md#5-agent-runner), SDK notes in [`../../AGENTS.md`](../../AGENTS.md#claude-agent-sdk-integration-notes), and [`../chat-feature-catalog.md`](../chat-feature-catalog.md). **No reduced subset.**

---

## P4-T1 — Profile → SDK `Options` mapper

- **Goal:** Pure function mapping an agent profile (+ workspace + settings) to SDK `Options` for interactive chat.
- **Depends on:** —
- **Files:** `apps/server/src/services/runner/mapProfileToOptions.ts`, `packages/shared/src/schemas/sdkOptions.ts`, tests.
- **Implementation notes:** Map fields per architecture §5. Always set `includePartialMessages: true`, `forwardSubagentText: true`, `enableFileCheckpointing: true`, and `toolConfig.askUserQuestion.previewFormat` (`html` or `markdown`). If a restricted `allowedTools`/`tools` list is used, **union in** `AskUserQuestion`, and `Skill` / `Agent` when skills/subagents are enabled. `canUseTool` is attached by the runner, not the mapper. If `permissionMode = bypassPermissions`, set `allowDangerouslySkipPermissions: true` only when `allowBypassPermissions` is enabled; otherwise reject. `settingSources` always includes `'user'`; add `'project'` for repo `.claude`.
- **Acceptance criteria:** Representative profiles map correctly; bypass gated; settingSources invariant; restricted tool lists still contain AskUserQuestion (and Skill/Agent when those features are on); chat flags present.
- **Test requirements:** Vitest: default mapping, tool allow/deny + required unions, bypass gating, settingSources, chat flags.
- **Done definition:** Tests green.

## P4-T2 — SDK client seam (streaming input + Query)

- **Goal:** Injectable wrapper around `query()` that exposes the live `Query` object.
- **Depends on:** —
- **Files:** `apps/server/src/services/runner/sdkClient.ts`, tests.
- **Implementation notes:** Interface starts a streaming-input query and returns `{ messages: AsyncIterable<SDKMessage>, query: QueryLike }` where `QueryLike` includes `interrupt`, `setPermissionMode`, `setModel`, `applyFlagSettings`, `rewindFiles`, `stopTask`, `streamInput`, MCP methods, `reinitialize`, `supportedCommands` / `Models` / `Agents`, `mcpServerStatus`, `getContextUsage`, `close`. Real impl delegates to `@anthropic-ai/claude-agent-sdk`. Fake yields scripted `SDKMessage`s covering **every catalog M* type** (can be split across tests) and **blocks** `canUseTool` until the harness resolves `requestId`.
- **Acceptance criteria:** Real client compiles against SDK types; fake yields catalog messages; `canUseTool` does not resolve AskUserQuestion with empty answers before the harness replies.
- **Test requirements:** Vitest: iterate fake messages; blocked `canUseTool` until resolve; QueryLike method stubs callable.
- **Done definition:** Tests green.

## P4-T3 — Session runner (stream + persist full catalog)

- **Goal:** Orchestrate a run: branch, streaming query, persist/stream **every** catalog message, usage, finalize.
- **Depends on:** P4-T1, P4-T2; Phase 1 P1-T4; Phase 3 P3-T2.
- **Files:** `apps/server/src/services/runner/sessionRunner.ts`, tests, shared catalog-id fixtures.
- **Implementation notes:** Snapshot profile; ensure clone + branch; `running`; iterate SDK messages; append `session_message` with monotonic `seq` (skip durable persist of replaceable `stream_event` once the completed assistant message exists, but still SSE them live); emit SSE `message`/`usage`/`status`. Capture `sdkSessionId` early from init. Persist even on error/cancel. Do not mark terminal success while a `canUseTool` waiter is outstanding.
- **Acceptance criteria:** Catalog fixtures persist in order and stream; usage/cost from result; terminal status correct; profile snapshot stored; partials stream then collapse to the completed message.
- **Test requirements:** Vitest with fake SDK + mocked git: happy path; error path; at least one fixture per catalog **M** id (table-driven).
- **Done definition:** Tests green.

## P4-T4 — PR creation on success

- **Goal:** When a successful run produced changes, commit, push, and open a PR.
- **Depends on:** P4-T3; Phase 3 P3-T2, P3-T3.
- **Files:** `apps/server/src/services/runner/sessionRunner.ts` (extend), tests.
- **Implementation notes:** After a successful result, if `hasChanges()`: stage, commit (message derived from the prompt/summary), push the session branch, and `gh pr create`; store `branchName` and `prUrl` on the session. If no changes, finish `succeeded` with no PR. PR/push failures set an appropriate terminal status with a clear message.
- **Acceptance criteria:** Changes ⇒ commit/push/PR and `prUrl` stored; no changes ⇒ no PR; push/PR failure surfaced and recorded.
- **Test requirements:** Vitest tests with mocked git/github: changes→PR URL stored; no-changes→no PR; PR failure path.
- **Done definition:** Tests green.

## P4-T5 — Registry, cancel, resume, fork, interrupt, follow-up

- **Goal:** Hold the live `Query`; cancel/close; resume/fork; interrupt; append user turns (text, attachments, slash commands) via `streamInput`.
- **Depends on:** P4-T3.
- **Files:** `apps/server/src/services/runner/sessionRunner.ts` (extend), `apps/server/src/services/runner/registry.ts`, tests.
- **Implementation notes:** In-memory registry keyed by session id: Query, abort, pending waiters. Cancel/`close` stops iteration, cancels pendings, marks `canceled`, keeps transcript. Follow-up uses `streamInput` while running, or `resume` + new query if the process ended. Fork uses SDK `fork` from a stored `sdkSessionId`. Interrupt calls `Query.interrupt()`. User messages set `origin: { kind: "human" }`.
- **Acceptance criteria:** Cancel retains partial transcript; follow-up appends; fork creates a new session row from history; interrupt stops the current turn without dropping the session; attachments accepted on the user turn.
- **Test requirements:** Vitest: cancel, resume, fork, interrupt, follow-up with attachment payload, slash-command user turn.
- **Done definition:** Tests green.

## P4-T6 — Session API (+ SSE reconnect)

- **Goal:** HTTP surface for create/list/get, SSE with `afterSeq`, cancel, messages, catalog control snapshot.
- **Depends on:** P4-T3, P4-T4, P4-T5, P4-T7, P4-T8; Phase 2 P2-T3; Phase 1 P1-T8.
- **Files:** `apps/server/src/routes/sessions.ts`, tests.
- **Implementation notes:** `POST /api/sessions`; `GET /api/sessions`; `GET /api/sessions/:id` returns transcript + **pending_user_inputs** + control snapshot (commands, models, agents, MCP status, tasks, context usage when live). `GET /api/sessions/:id/stream?afterSeq=` emits events with `id = seq` and **replays current pendings** on subscribe. `POST .../cancel`; `POST .../messages` (text, attachments, slash command); `POST .../user-input` (P4-T7). Validate workspace + profile.
- **Acceptance criteria:** Create starts a run; stream ordered; reconnect from `afterSeq` does not duplicate or skip durable messages; get includes pendings; cancel and messages behave per P4-T5.
- **Test requirements:** Vitest route tests: create→run, stream order, afterSeq resume, pending replay on subscribe, cancel, follow-up, validation.
- **Done definition:** Tests green.

## P4-T7 — Pending user-input bridge (`canUseTool` + elicitation)

- **Goal:** Pause the SDK until the user answers; survive browser restart; support multiple concurrent prompts and multi-question AskUserQuestion.
- **Depends on:** P4-T2, P4-T3; Phase 1 P1-T8.
- **Files:** `apps/server/src/services/runner/userInputBridge.ts`, tests.
- **Implementation notes:** `canUseTool` inserts a pending row (`permission` or `ask_user_question`), emits `user_input_request`, awaits a resolver keyed by `requestId`. MCP elicitation / `ExitPlanMode` / `ShowOnboardingRolePicker` use the same table with their `kind`. `POST /api/sessions/:id/user-input` supplies allow/deny/`updatedPermissions` or AskUserQuestion `answers` (all questions required; no top-level `response` when `answers` is set). Idempotent resolve. Cancel rejects waiters. Fake SDK must remain blocked until resolve.
- **Acceptance criteria:** Permission allow/deny/remember; AskUserQuestion with N questions in one payload; second AskUserQuestion round; two concurrent `requestId`s; reload-style resolve after the waiter still exists; empty-answers auto-complete is a test failure.
- **Test requirements:** Vitest covering P1–P7 in [`../chat-feature-catalog.md`](../chat-feature-catalog.md) §6.
- **Done definition:** Tests green.

## P4-T8 — Live Query controls API

- **Goal:** Expose every catalog **C** control against the registry’s `Query`.
- **Depends on:** P4-T5.
- **Files:** `apps/server/src/routes/sessionControls.ts` (or extend `sessions.ts`), tests.
- **Implementation notes:** `POST /api/sessions/:id/interrupt`; `POST /api/sessions/:id/controls` discriminated body: `setPermissionMode`, `setModel`, `applyFlagSettings`, `rewindFiles` (incl. dryRun), `stopTask`, MCP reconnect/toggle/replace. 409 if the session is not live. Emit SSE `control` after success.
- **Acceptance criteria:** Each control reaches the fake Query; dry-run rewind returns a preview without writing; missing live query → 409.
- **Test requirements:** Vitest one case per catalog **C4–C10** (plus interrupt C4).
- **Done definition:** Tests green.
