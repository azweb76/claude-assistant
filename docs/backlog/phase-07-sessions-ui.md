# Phase 7 — Sessions UI (reusable chat, full catalog)

**Theme:** Create sessions and drive them through a **reusable chat component** that implements every row of [`../chat-feature-catalog.md`](../chat-feature-catalog.md). List and reopen sessions. Browser restart mid-run restores transcript and pending prompts.

**Depends on:** Phase 4 (session API + SSE + user-input + controls), Phase 6 (workspaces + profiles available to pick).

**Exit criteria:** A user can start a session, use the chat for the **entire** catalog (messages, tools, permissions, multi-question AskUserQuestion, MCP elicitation, plan/worktree/tasks, slash commands, attachments, Query controls), reload the tab without losing state, finish a run with a PR link, cancel/interrupt, and browse all sessions. There is no “text + permissions only” milestone.

---

## P7-T1 — Create-session flow

- **Goal:** A form to start a new session (prompt, attachments, workspace, profile).
- **Depends on:** Phase 4 P4-T6; Phase 6 P6-T2, P6-T3.
- **Files:** `apps/web/src/routes/NewSessionPage.tsx`, `apps/web/src/components/sessions/NewSessionForm.tsx`, tests.
- **Implementation notes:** Select a workspace and an agent profile, enter a prompt, attach optional files/images, optionally override select profile settings (reuse Phase 6 controls). Submit calls `POST /api/sessions` and navigates to the session chat.
- **Acceptance criteria:** Valid submit starts a session and routes to chat; missing workspace/profile/prompt blocked; overrides and attachments included in the request.
- **Test requirements:** Vitest + Testing Library with mocked client: successful create+navigate, validation failure, overrides and attachments passed through.
- **Done definition:** Tests green; manual verification.

## P7-T2 — Chat shell (reusable)

- **Goal:** One `Chat` component used by live and historical views: message list, composer slot, pending-prompt slot, usage meter, auto-scroll.
- **Depends on:** P7-T1; Phase 5 P5-T4.
- **Files:** `apps/web/src/components/chat/Chat.tsx`, `apps/web/src/components/chat/ChatContext.tsx`, `apps/web/src/routes/SessionChatPage.tsx`, tests.
- **Implementation notes:** Props: `sessionId`, `mode: live | readonly`. Live mode hydrates GET then SSE from last seq. Readonly uses GET only. Pause-on-scroll. Usage/cost meter from usage events / result. Do not fork a second transcript component.
- **Acceptance criteria:** Live and readonly both render the same message list; live subscribes; readonly does not open SSE; remounting with the same GET payload shows the same messages.
- **Test requirements:** Vitest + Testing Library: live vs readonly; hydrate-then-stream; auto-scroll pause.
- **Done definition:** Tests green; manual verification.

## P7-T3 — Catalog message renderers (every M* and B*)

- **Goal:** Render every `SDKMessage` type and content block in the catalog.
- **Depends on:** P7-T2.
- **Files:** `apps/web/src/components/chat/messages/*`, `packages/shared/src/catalog/*.ts` (fixture ids), tests.
- **Implementation notes:** Table-driven renderers keyed by type/subtype. Unknown types: JSON inspector **and** a failing catalog-completeness test until a renderer exists. Include thinking, citations, images, documents, origins (human/peer/task-notification/…), compact, hooks, plugin install, tasks, background tasks, rate limit, retries, memory recall, prompt suggestions, permission-denied, elicitation complete, informational banners, conversation reset, worker shutting down (live only).
- **Acceptance criteria:** Every catalog **M** and **B** id has a fixture that renders identifiable UI; completeness test lists all ids.
- **Test requirements:** Vitest + Testing Library table test over fixtures; completeness test.
- **Done definition:** Tests green.

## P7-T4 — Catalog tool cards (every K*)

- **Goal:** Dedicated cards for every built-in tool schema, including off-by-default tools when emitted.
- **Depends on:** P7-T3.
- **Files:** `apps/web/src/components/chat/tools/*`, tests.
- **Implementation notes:** One card (or family) per catalog **K** id: Bash, Read/Write/Edit (diffs, image/PDF preview), Glob/Grep, WebFetch/WebSearch, Agent nested thread, Workflow phases, Todo + Task board, Monitor, Notebook, MCP resources, worktree, cron/wakeup, RemoteTrigger, PushNotification, REPL, ReportFindings, Artifact, Projects, Skill, unknown inspector. Nested subagent via `parent_tool_use_id`.
- **Acceptance criteria:** Every **K** id fixture renders; generic JSON is only the fallback for unknown tools.
- **Test requirements:** Table-driven Testing Library tests per **K** id.
- **Done definition:** Tests green.

## P7-T5 — Blocking prompts (permissions, AskUserQuestion, elicitation, plan exit, role picker)

- **Goal:** All catalog **P** kinds, including multiple concurrent prompts and multi-question AskUserQuestion.
- **Depends on:** P7-T2; Phase 4 P4-T7.
- **Files:** `apps/web/src/components/chat/prompts/*`, tests.
- **Implementation notes:** Permission: allow / deny / remember. AskUserQuestion: **all** questions in one card; multi-select; previews; Other/freeform; submit `answers` keyed by question text; never send top-level `response` with structured answers. Sequential rounds and concurrent `requestId`s all visible. MCP elicitation form. ExitPlanMode confirm. Role picker chips. Readonly history of resolved prompts from transcript tool_results.
- **Acceptance criteria:** Fixtures for P1–P9; two AskUserQuestion questions answered together; two pending requestIds; deny path; dontAsk shows permission-denied message without a card.
- **Test requirements:** Testing Library + mocked client posts; reload (remount) still shows unanswered prompts from GET pendings.
- **Done definition:** Tests green; manual verification.

## P7-T6 — Composer, slash commands, attachments, interrupt

- **Goal:** Catalog **C1–C4** in the chat chrome.
- **Depends on:** P7-T2; Phase 4 P4-T5, P4-T6.
- **Files:** `apps/web/src/components/chat/composer/*`, tests.
- **Implementation notes:** Text send while idle and while running. File/image attachments. Slash-command palette from control snapshot + `SDKCommandsChangedMessage`. Interrupt button. Disable send only when a blocking prompt requires answers first **if** the product chooses that UX — still allow interrupt/cancel. Follow-up is the same composer, not a separate control.
- **Acceptance criteria:** Send, attach, slash insert, interrupt each hit the mocked client with the right body.
- **Test requirements:** Testing Library for each action; slash list updates on commands-changed event.
- **Done definition:** Tests green; manual verification.

## P7-T7 — Live Query controls chrome

- **Goal:** Catalog **C5–C14** (mode, model, flag settings, rewind, stopTask, MCP, context meter, account/auth).
- **Depends on:** P7-T2; Phase 4 P4-T8.
- **Files:** `apps/web/src/components/chat/controls/*`, tests.
- **Implementation notes:** Permission-mode switcher; model switcher; effort/ultracode via applyFlagSettings; rewind-from-message with dry-run preview; background-task stop; MCP status/reconnect/toggle; context usage meter; auth/rate-limit banners from messages. Hidden or disabled in readonly when the session is not live.
- **Acceptance criteria:** Each control posts the matching controls API body; dry-run rewind shows preview; MCP status renders.
- **Test requirements:** Testing Library one case per C5–C12.
- **Done definition:** Tests green.

## P7-T8 — Browser restart / reconnect

- **Goal:** Catalog **T4–T6**: remount restores messages + pendings; SSE continues; double-submit is idempotent.
- **Depends on:** P7-T2, P7-T5; Phase 5 P5-T4.
- **Files:** tests under `apps/web/src/components/chat/__tests__/reconnect.test.tsx` (implementation already in Chat).
- **Implementation notes:** Simulate: GET transcript + one permission pending + one AskUserQuestion pending → first paint shows both. Then SSE with `afterSeq` appends new messages. Resolve one prompt; second remount does not show it. Duplicate seq ignored.
- **Acceptance criteria:** No blank chat after remount; pendings reappear until resolved; no duplicate bubbles.
- **Test requirements:** The reconnect test file above is required and must fail if hydration is skipped.
- **Done definition:** Tests green.

## P7-T9 — Sessions list page

- **Goal:** Browse all sessions with key metadata and selection (for analysis in Phase 8).
- **Depends on:** Phase 4 P4-T6; Phase 5 P5-T2.
- **Files:** `apps/web/src/routes/SessionsPage.tsx`, `apps/web/src/components/sessions/SessionsTable.tsx`, tests.
- **Implementation notes:** Table/list showing workspace, profile, status, turns, tokens, cost, PR link, and timestamps. Row click opens the chat. Include multi-select checkboxes and an "Analyze selected" action that is wired in Phase 8 (present but may be disabled until then).
- **Acceptance criteria:** All sessions listed with metadata; navigation to chat works; multi-select state is maintained for later analysis.
- **Test requirements:** Vitest + Testing Library with mocked client: list render, navigation, multi-select behavior.
- **Done definition:** Tests green; manual verification.

## P7-T10 — Historical chat (readonly reuse)

- **Goal:** Completed sessions use the same `Chat` in readonly (full catalog render, no live waiters unless status is still `running`).
- **Depends on:** P7-T3, P7-T4, P7-T9.
- **Files:** `apps/web/src/routes/SessionChatPage.tsx` (route param), tests.
- **Implementation notes:** Do not introduce `SessionDetailPage` with a second renderer. If the session is still `running`, use live mode (reconnect). Fork action may start a new session from this `sdkSessionId`.
- **Acceptance criteria:** Completed session shows full ordered catalog UI + metadata + PR link; running session from list uses live Chat.
- **Test requirements:** Testing Library: completed readonly fixture; running uses SSE mock.
- **Done definition:** Tests green; manual verification.
