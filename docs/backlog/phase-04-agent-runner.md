# Phase 4 — Agent runner (Claude Agent SDK)

**Theme:** Run real agent sessions: map profiles to SDK options, stream and persist the transcript, manage lifecycle, and open a PR on success.

**Depends on:** Phase 1, Phase 2, Phase 3

**Exit criteria:** A session can be created and run end to end against a cloned workspace; the transcript, usage, and cost persist; the run streams over SSE; a successful run with changes opens a PR; runs can be canceled and resumed. The SDK is injected and mocked in tests.

Reference: agent runner in [`../architecture.md`](../architecture.md#5-agent-runner) and SDK notes in [`../../AGENTS.md`](../../AGENTS.md#claude-agent-sdk-integration-notes).

---

## P4-T1 — Profile → SDK `Options` mapper

- **Goal:** Pure function mapping an agent profile (+ workspace + settings) to SDK `Options`.
- **Depends on:** —
- **Files:** `apps/server/src/services/runner/mapProfileToOptions.ts`, `packages/shared/src/schemas/sdkOptions.ts`, tests.
- **Implementation notes:** Map fields per the table in architecture §5: `model`, `effort`, `permissionMode`, `allowedTools`/`disallowedTools`, `skills`, `agents`, `settingSources` (ensure `'user'` included for auth/user skills; add `'project'` when using repo `.claude`), `cwd` = clone path, `maxTurns`, `maxBudgetUsd`, appended `systemPrompt`. If `permissionMode = bypassPermissions`, set `allowDangerouslySkipPermissions: true` only when the `allowBypassPermissions` setting is enabled; otherwise reject.
- **Acceptance criteria:** Correct options produced for representative profiles; `bypassPermissions` gated by the setting; `settingSources` always includes `'user'`.
- **Test requirements:** Vitest tests: default profile mapping, tool allow/deny mapping, bypass gating (allowed vs rejected), settingSources invariants.
- **Done definition:** Tests green.

## P4-T2 — SDK client seam

- **Goal:** An injectable wrapper around `query()` so the runner is testable.
- **Depends on:** —
- **Files:** `apps/server/src/services/runner/sdkClient.ts`, tests.
- **Implementation notes:** Define an interface `runQuery(prompt, options): AsyncIterable<SdkMessage>`; the real impl delegates to `@anthropic-ai/claude-agent-sdk`'s `query`. Provide a fake that yields a scripted message sequence for tests. Normalize/validate messages at this boundary.
- **Acceptance criteria:** Real client compiles against the SDK types; fake yields scripted messages; interface hides SDK details from the runner.
- **Test requirements:** Vitest test iterating the fake client and asserting the normalized message shape.
- **Done definition:** Tests green.

## P4-T3 — Session runner (stream + persist)

- **Goal:** Orchestrate a run: prepare branch, call the SDK, persist/stream messages and usage, finalize status.
- **Depends on:** P4-T1, P4-T2; Phase 1 P1-T4; Phase 3 P3-T2.
- **Files:** `apps/server/src/services/runner/sessionRunner.ts`, tests.
- **Implementation notes:** Steps: snapshot profile into the session; via git service ensure clean clone + create branch; set status `running`; iterate SDK messages, appending each as a `session_message` and emitting SSE `message`/`usage`; on the `result` message capture `sdkSessionId`, tokens, `total_cost_usd`, `numTurns`; set terminal status. Emit `status` events. Persist even on error/cancel.
- **Acceptance criteria:** Messages persist in order and stream live; usage/cost recorded from the result; terminal status correct for success/failure; profile snapshot stored.
- **Test requirements:** Vitest tests with the fake SDK client + mocked git: happy path (messages persisted/streamed, usage captured), and error path (status `failed`, partial transcript persisted).
- **Done definition:** Tests green.

## P4-T4 — PR creation on success

- **Goal:** When a successful run produced changes, commit, push, and open a PR.
- **Depends on:** P4-T3; Phase 3 P3-T2, P3-T3.
- **Files:** `apps/server/src/services/runner/sessionRunner.ts` (extend), tests.
- **Implementation notes:** After a successful result, if `hasChanges()`: stage, commit (message derived from the prompt/summary), push the session branch, and `gh pr create`; store `branchName` and `prUrl` on the session. If no changes, finish `succeeded` with no PR. PR/push failures set an appropriate terminal status with a clear message.
- **Acceptance criteria:** Changes ⇒ commit/push/PR and `prUrl` stored; no changes ⇒ no PR; push/PR failure surfaced and recorded.
- **Test requirements:** Vitest tests with mocked git/github: changes→PR URL stored; no-changes→no PR; PR failure path.
- **Done definition:** Tests green.

## P4-T5 — Cancel and resume

- **Goal:** Support canceling a running session and resuming with a follow-up prompt.
- **Depends on:** P4-T3.
- **Files:** `apps/server/src/services/runner/sessionRunner.ts` (extend), `apps/server/src/services/runner/registry.ts`, tests.
- **Implementation notes:** Maintain an in-memory registry of active runs keyed by session id, with an abort mechanism to stop iteration and mark `canceled`. Resume issues a new run reusing `sdkSessionId` via the SDK `resume` option and appends to the same session transcript.
- **Acceptance criteria:** Cancel stops streaming and sets `canceled` with the partial transcript retained; resume continues the same session and appends messages.
- **Test requirements:** Vitest tests: cancel mid-stream (status + partial transcript), resume appends using the prior `sdkSessionId`.
- **Done definition:** Tests green.

## P4-T6 — Session API endpoints (+ SSE)

- **Goal:** Expose session create/list/get, live stream, cancel, and follow-up.
- **Depends on:** P4-T3, P4-T4, P4-T5; Phase 2 P2-T3.
- **Files:** `apps/server/src/routes/sessions.ts`, tests.
- **Implementation notes:** `POST /api/sessions` creates and starts a run (async); `GET /api/sessions` and `GET /api/sessions/:id` (with transcript); `GET /api/sessions/:id/stream` SSE for live events; `POST /api/sessions/:id/cancel`; `POST /api/sessions/:id/messages` for a follow-up. Validate inputs; require a valid workspace + profile.
- **Acceptance criteria:** Creating a session starts a run and returns its id; stream emits ordered events for a running session; cancel and follow-up behave per P4-T5; get returns the full transcript.
- **Test requirements:** Vitest route tests with fake SDK/git: create→run, stream event order, cancel, follow-up, and validation failures.
- **Done definition:** Tests green.
