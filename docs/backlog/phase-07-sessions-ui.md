# Phase 7 — Sessions UI

**Theme:** Create sessions, watch them run live, and browse past sessions.

**Depends on:** Phase 4 (session API + SSE), Phase 6 (workspaces + profiles available to pick).

**Exit criteria:** A user can start a session (prompt + workspace + profile), watch the streaming transcript with running token/cost totals and status, see the resulting PR link, cancel a run, send a follow-up, and browse a list of all sessions.

---

## P7-T1 — Create-session flow

- **Goal:** A form to start a new session.
- **Depends on:** Phase 4 P4-T6; Phase 6 P6-T2, P6-T3.
- **Files:** `apps/web/src/routes/NewSessionPage.tsx`, `apps/web/src/components/sessions/NewSessionForm.tsx`, tests.
- **Implementation notes:** Select a workspace and an agent profile, enter a prompt, optionally override select profile settings for this run (reuse Phase 6 controls). Submit calls `POST /api/sessions` and navigates to the live run view.
- **Acceptance criteria:** Valid submit starts a session and routes to its run view; missing workspace/profile/prompt blocked with validation; optional overrides included in the request.
- **Test requirements:** Vitest + Testing Library with mocked client: successful create+navigate, validation failure, overrides passed through.
- **Done definition:** Tests green; manual verification.

## P7-T2 — Live run view (streaming transcript)

- **Goal:** Render the live transcript, tool activity, running usage/cost, and status.
- **Depends on:** P7-T1; Phase 5 P5-T4 (SSE hook).
- **Files:** `apps/web/src/routes/SessionRunPage.tsx`, `apps/web/src/components/sessions/Transcript.tsx`, `apps/web/src/components/sessions/UsageMeter.tsx`, tests.
- **Implementation notes:** Subscribe via `useEventStream` to `/api/sessions/:id/stream`. Render assistant messages, tool-use/tool-result entries (clearly distinguished), a running token/cost meter, and the status. On completion, show the PR link (or "no changes"/error). Auto-scroll with a pause-on-scroll affordance.
- **Acceptance criteria:** Streamed events render in order with correct types; usage/cost update live; terminal state shows PR link or the appropriate no-PR/error message.
- **Test requirements:** Vitest + Testing Library with a mocked event stream: ordered rendering, usage updates, terminal PR/no-PR/error rendering.
- **Done definition:** Tests green; manual verification of a real streamed run.

## P7-T3 — Cancel and follow-up controls

- **Goal:** Cancel a running session and send a follow-up prompt (resume).
- **Depends on:** P7-T2; Phase 4 P4-T5.
- **Files:** `apps/web/src/components/sessions/RunControls.tsx`, tests.
- **Implementation notes:** Cancel button visible while running (calls cancel endpoint, reflects `canceled`). Follow-up input available after a run completes, posting to the messages endpoint and resuming the stream in the same view/transcript.
- **Acceptance criteria:** Cancel transitions the view to `canceled` and stops streaming; follow-up continues the same session and appends new events.
- **Test requirements:** Vitest + Testing Library with mocked client/stream: cancel path, follow-up append path.
- **Done definition:** Tests green; manual verification.

## P7-T4 — Sessions list page

- **Goal:** Browse all sessions with key metadata and selection (for analysis in Phase 8).
- **Depends on:** Phase 4 P4-T6; Phase 5 P5-T2.
- **Files:** `apps/web/src/routes/SessionsPage.tsx`, `apps/web/src/components/sessions/SessionsTable.tsx`, tests.
- **Implementation notes:** Table/list showing workspace, profile, status, turns, tokens, cost, PR link, and timestamps. Row click opens the run/detail view. Include multi-select checkboxes and an "Analyze selected" action that is wired in Phase 8 (present but may be disabled until then).
- **Acceptance criteria:** All sessions listed with metadata; navigation to detail works; multi-select state is maintained for later analysis.
- **Test requirements:** Vitest + Testing Library with mocked client: list render, navigation, multi-select behavior.
- **Done definition:** Tests green; manual verification.

## P7-T5 — Session detail (historical transcript)

- **Goal:** View a completed session's full transcript and metadata without streaming.
- **Depends on:** P7-T2.
- **Files:** `apps/web/src/routes/SessionDetailPage.tsx`, tests (may share transcript component with P7-T2).
- **Implementation notes:** Fetch `GET /api/sessions/:id` and render the persisted transcript, final usage/cost, status, branch, and PR link. Reuse the `Transcript` component.
- **Acceptance criteria:** A completed session renders its full ordered transcript and final metadata.
- **Test requirements:** Vitest + Testing Library with mocked client: render a completed session's transcript and metadata.
- **Done definition:** Tests green; manual verification.
