# Phase 7 — Sessions UI (reusable interactive chat)

**Theme:** Create sessions and drive them through a **reusable chat component**. Implement every row of [`../chat-feature-catalog.md`](../chat-feature-catalog.md). List and reopen sessions. Browser restart mid-run restores transcript and pending prompts.

**Depends on:** Phase 4 (session API + SSE + user-input + controls), Phase 6 (workspaces + profiles available to pick).

**Exit criteria:** A user can start a session (prompt + workspace + profile), chat through a permission prompt and a multi-question AskUserQuestion, reload the tab without losing transcript or unanswered prompts, use the rest of the catalog (tools, MCP elicitation, plan/worktree/tasks, slash commands, attachments, Query controls), see the PR link, cancel/interrupt, and browse all sessions.

---

## P7-T1 — Create-session flow

- **Goal:** A form to start a new session.
- **Depends on:** Phase 4 P4-T6; Phase 6 P6-T2, P6-T3.
- **Files:** `apps/web/src/routes/NewSessionPage.tsx`, `apps/web/src/components/sessions/NewSessionForm.tsx`, tests.
- **Implementation notes:** Select a workspace and an agent profile, enter a prompt, optionally attach files/images, optionally override select profile settings for this run (reuse Phase 6 controls). Submit calls `POST /api/sessions` and navigates to the live chat.
- **Acceptance criteria:** Valid submit starts a session and routes to its chat; missing workspace/profile/prompt blocked with validation; optional overrides and attachments included in the request.
- **Test requirements:** Vitest + Testing Library with mocked client: successful create+navigate, validation failure, overrides passed through.
- **Done definition:** Tests green; manual verification.

## P7-T2 — Chat message renderer

- **Goal:** Typed blocks for the full catalog message/content-block matrix (not a page-specific `Transcript.tsx`).
- **Depends on:** P7-T1; Phase 5 P5-T4.
- **Files:** `apps/web/src/components/chat/messages/*`, `packages/shared/src/catalog/*.ts` (fixture ids), tests.
- **Implementation notes:** Table-driven renderers for every catalog **M\*** and **B\*** id: user/assistant markdown, thinking/redacted thinking, token streaming, citations, images/documents, origins, compact, hooks, plugin install, tasks, background tasks, rate limit, retries, memory recall, prompt suggestions, permission-denied, elicitation complete, informational banners, conversation reset, worker shutting down (live only). Unknown types: JSON inspector **and** a failing catalog-completeness test until a renderer is added. Tool_use blocks may render a generic shell here; dedicated tool cards land in P7-T9.
- **Acceptance criteria:** Streamed/hydrated events render in order with correct types; every **M** and **B** id has a fixture that renders identifiable UI.
- **Test requirements:** Vitest + Testing Library table test over fixtures; catalog completeness test; ordered rendering from a mocked event sequence.
- **Done definition:** Tests green.

## P7-T3 — Live session chat

- **Goal:** The reusable `Chat` shell: live SSE, usage/cost, auto-scroll, composer, cancel — used by live and historical views.
- **Depends on:** P7-T2.
- **Files:** `apps/web/src/components/chat/Chat.tsx`, `apps/web/src/components/chat/ChatContext.tsx`, `apps/web/src/components/chat/composer/*`, `apps/web/src/routes/SessionChatPage.tsx`, tests.
- **Implementation notes:** Subscribe via `useEventStream` to `/api/sessions/:id/stream` after GET hydrate. Props: `sessionId`, `mode: live | readonly`. Render P7-T2 messages, a running token/cost meter, and status. Auto-scroll with pause-on-scroll. Cancel while running. Composer sends follow-ups (text, attachments, slash commands from the control snapshot) via `POST .../messages` and `interrupt` via `POST .../interrupt`. Do not introduce a second transcript component. Terminal state shows the PR link (or no-changes/error).
- **Acceptance criteria:** Streamed events render in order; usage/cost update live; terminal state shows PR link or the appropriate no-PR/error message; cancel stops streaming; follow-up appends in the same chat.
- **Test requirements:** Vitest + Testing Library with mocked stream/client: ordered rendering, usage updates, terminal PR/no-PR/error, cancel path, follow-up append path.
- **Done definition:** Tests green; manual verification of a real streamed run.

## P7-T4 — Sessions list page

- **Goal:** Browse all sessions with key metadata and selection (for analysis in Phase 8).
- **Depends on:** Phase 4 P4-T6; Phase 5 P5-T2.
- **Files:** `apps/web/src/routes/SessionsPage.tsx`, `apps/web/src/components/sessions/SessionsTable.tsx`, tests.
- **Implementation notes:** Table/list showing workspace, profile, status, turns, tokens, cost, PR link, and timestamps. Row click opens the chat. Include multi-select checkboxes and an "Analyze selected" action that is wired in Phase 8 (present but may be disabled until then).
- **Acceptance criteria:** All sessions listed with metadata; navigation to chat works; multi-select state is maintained for later analysis.
- **Test requirements:** Vitest + Testing Library with mocked client: list render, navigation, multi-select behavior.
- **Done definition:** Tests green; manual verification.

## P7-T5 — Historical chat (readonly reuse)

- **Goal:** View a completed session’s full transcript and metadata without streaming, using the same `Chat` component.
- **Depends on:** P7-T2, P7-T3.
- **Files:** `apps/web/src/routes/SessionChatPage.tsx` (readonly mode), tests.
- **Implementation notes:** Fetch `GET /api/sessions/:id` and render the persisted catalog transcript, final usage/cost, status, branch, and PR link. Reuse `Chat` with `mode: readonly`. If status is still `running`, use live mode (reconnect) instead. Do not add `SessionDetailPage` with a second renderer. Fork may start a new session from `sdkSessionId`.
- **Acceptance criteria:** A completed session renders its full ordered transcript and final metadata; a still-running session uses live Chat.
- **Test requirements:** Vitest + Testing Library with mocked client: completed transcript + metadata; running uses SSE mock.
- **Done definition:** Tests green; manual verification.

## P7-T6 — Permission card

- **Goal:** Interactive `canUseTool` permission UI (catalog **P1**, **P8**, **P9**).
- **Depends on:** P7-T3; Phase 4 P4-T7.
- **Files:** `apps/web/src/components/chat/prompts/PermissionCard.tsx`, tests.
- **Implementation notes:** Show tool name, input summary, `blockedPath`, `decisionReason`, subagent `agentID`. Actions: allow, deny (with message), optional always-allow via `updatedPermissions` from SDK `suggestions`. Honor `permissionMode`: `acceptEdits` / `bypassPermissions` do not prompt except for `AskUserQuestion` and other `requiresUserInteraction` tools. `dontAsk` / auto-deny: no card; render `SDKPermissionDeniedMessage`. POST `.../user-input` with `requestId`.
- **Acceptance criteria:** Allow/deny/remember post the correct body; denied auto-events render without a prompt; concurrent permission `requestId`s all visible.
- **Test requirements:** Vitest + Testing Library with mocked client: allow, deny, remember, concurrent requestIds.
- **Done definition:** Tests green; manual verification.

## P7-T7 — AskUserQuestion card

- **Goal:** Multi-question, multi-round, concurrent AskUserQuestion (catalog **P2–P4**).
- **Depends on:** P7-T3; Phase 4 P4-T7.
- **Files:** `apps/web/src/components/chat/prompts/AskUserQuestionCard.tsx`, tests.
- **Implementation notes:** Render **every** `questions[]` item before submit. Single-select, multi-select, option `preview` (markdown/html). Per-question freeform “Other”. Submit builds `answers` keyed by **question text**. Do **not** set top-level `response` when structured `answers` exist. Sequential rounds are new pending rows; concurrent `requestId`s (subagents) all stay visible. History of answered rounds remains in the transcript.
- **Acceptance criteria:** Two questions in one call answered together; a later round appears as a new card; two concurrent AskUserQuestion `requestId`s; freeform Other stored as the answer value.
- **Test requirements:** Vitest + Testing Library: multi-question submit body shape, sequential round, concurrent requestIds, Other/freeform.
- **Done definition:** Tests green; manual verification.

## P7-T8 — Reload / reconnect

- **Goal:** Browser restart restores ordered transcript, SSE from last `seq`, and unanswered prompts (catalog **T4–T6**).
- **Depends on:** P7-T3, P7-T6, P7-T7; Phase 5 P5-T4.
- **Files:** `apps/web/src/components/chat/__tests__/reconnect.test.tsx` (implementation already in `Chat` + `useEventStream`).
- **Implementation notes:** Simulate remount: GET transcript + one permission pending + one AskUserQuestion pending → first paint shows both. SSE with `afterSeq` appends new messages; duplicate seq ignored. Resolve one prompt; second remount does not show it. Double-submit of the same `requestId` is idempotent.
- **Acceptance criteria:** No blank chat after remount; pendings reappear until resolved; posting an answer works; empty pending after resolve; no duplicate bubbles.
- **Test requirements:** The reconnect test file is required and must fail if hydration is skipped.
- **Done definition:** Tests green.

## P7-T9 — Catalog tool cards (every K*)

- **Goal:** Dedicated cards for every built-in tool schema, including off-by-default tools when emitted.
- **Depends on:** P7-T2.
- **Files:** `apps/web/src/components/chat/tools/*`, tests.
- **Implementation notes:** One card (or family) per catalog **K** id: Bash, Read/Write/Edit (diffs, image/PDF preview), Glob/Grep, WebFetch/WebSearch, Agent nested thread, Workflow phases, Todo + Task board, Monitor, Notebook, MCP resources, worktree, cron/wakeup, RemoteTrigger, PushNotification, REPL, ReportFindings, Artifact, Projects, Skill, unknown inspector. Nested subagent via `parent_tool_use_id`.
- **Acceptance criteria:** Every **K** id fixture renders; generic JSON is only the fallback for unknown tools.
- **Test requirements:** Table-driven Testing Library tests per **K** id.
- **Done definition:** Tests green.

## P7-T10 — Other blocking prompts (elicitation, plan exit, role picker)

- **Goal:** Catalog **P5–P7** using the same pending-input bridge as permissions/questions.
- **Depends on:** P7-T6; Phase 4 P4-T7.
- **Files:** `apps/web/src/components/chat/prompts/*` (extend), tests.
- **Implementation notes:** MCP elicitation schema form (accept/decline/cancel). `ExitPlanMode` confirm. `ShowOnboardingRolePicker` chips. All survive reload via pending rows.
- **Acceptance criteria:** Fixtures for P5–P7 post the correct `user-input` bodies; remount still shows unanswered elicitation.
- **Test requirements:** Testing Library + mocked client for each kind.
- **Done definition:** Tests green.

## P7-T11 — Live Query controls chrome

- **Goal:** Catalog **C5–C14** (mode, model, flag settings, rewind, stopTask, MCP, context meter, account/auth).
- **Depends on:** P7-T3; Phase 4 P4-T8.
- **Files:** `apps/web/src/components/chat/controls/*`, tests.
- **Implementation notes:** Permission-mode switcher; model switcher; effort/ultracode via applyFlagSettings; rewind-from-message with dry-run preview; background-task stop; MCP status/reconnect/toggle; context usage meter; auth/rate-limit banners. Hidden or disabled in readonly when the session is not live.
- **Acceptance criteria:** Each control posts the matching controls API body; dry-run rewind shows preview; MCP status renders.
- **Test requirements:** Testing Library one case per C5–C12.
- **Done definition:** Tests green.
