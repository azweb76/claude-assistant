# Phase 8 — Analysis & improvement engine

**Theme:** The improvement loop. Select sessions, analyze them for waste/inefficiency, and produce categorized, correctly-scoped **staged** improvements the user reviews as diffs and applies or discards.

**Depends on:** Phase 4 (transcripts/usage exist), Phase 7 (sessions list + selection).

**Exit criteria:** From the sessions list, a user selects one or more sessions, runs an analysis, and reviews staged improvements grouped by category and scope; each shows a diff and can be applied (writes to disk at the correct scope) or discarded (no disk change). Scope routing is enforced and tested.

Reference: analysis/staging engine in [`../architecture.md`](../architecture.md#7-analysis--staging-engine) and ADR-0009 in [`../decisions.md`](../decisions.md#adr-0009--manual-analysis-with-staged-scope-routed-improvements).

---

## P8-T1 — Transcript metrics extractor

- **Goal:** Compute objective waste/inefficiency signals from selected sessions.
- **Depends on:** —
- **Files:** `apps/server/src/services/analysis/metrics.ts`, tests.
- **Implementation notes:** From persisted `session_messages` + usage, compute signals such as: total/redundant tool calls, repeated reads of the same file, back-and-forth edits (thrash), turns vs. change size, cost per resulting diff line, and error/retry counts. Output a structured metrics object per session and aggregated.
- **Acceptance criteria:** Metrics computed deterministically from a transcript fixture; redundant-read and thrash signals detected on crafted inputs.
- **Test requirements:** Vitest tests over transcript fixtures asserting each computed signal.
- **Done definition:** Tests green.

## P8-T2 — Review-prompt builder

- **Goal:** Build the input for the review agent from transcripts + metrics.
- **Depends on:** P8-T1.
- **Files:** `apps/server/src/services/analysis/reviewPrompt.ts`, tests.
- **Implementation notes:** Assemble a prompt that includes the metrics and salient transcript excerpts, and instructs the review agent to return **structured** findings: each finding has a category (`claude_instructions|project_skill_agent|user_skill_agent`), a scope hint (generic vs project-specific), a rationale, a target (file/skill name), and proposed content. Keep within a size budget (truncate/summarize large transcripts deterministically).
- **Acceptance criteria:** Produces a deterministic prompt for a fixture; enforces the required structured-output contract; respects the size budget.
- **Test requirements:** Vitest snapshot/shape tests for the built prompt and the declared output schema.
- **Done definition:** Tests green.

## P8-T3 — Analyzer (review agent) + finding parser

- **Goal:** Run the review agent and parse its structured findings.
- **Depends on:** P8-T2; Phase 4 P4-T2 (SDK seam).
- **Files:** `apps/server/src/services/analysis/analyzer.ts`, `packages/shared/src/schemas/finding.ts`, tests.
- **Implementation notes:** Reuse the injectable SDK client seam with an analysis-specific model/effort from settings. Validate the agent's output against the shared `Finding` schema; reject/repair malformed output. Emit progress via SSE. The analyzer must be fully testable with the fake SDK client.
- **Acceptance criteria:** Given a scripted review response, produces validated findings; malformed output handled gracefully; progress events emitted.
- **Test requirements:** Vitest tests with the fake SDK client: valid findings parsed, malformed output rejected/repaired.
- **Done definition:** Tests green.

## P8-T4 — Scope router + staging (no disk writes)

- **Goal:** Turn findings into staged improvements with correct scope routing and target paths.
- **Depends on:** P8-T3; Phase 1 P1-T5.
- **Files:** `apps/server/src/services/analysis/scopeRouter.ts`, `apps/server/src/services/analysis/staging.ts`, tests.
- **Implementation notes:** Enforce the routing rule (ADR-0009): generic capabilities (plan, implement, code review, etc.) → **user** scope (`~/.claude/...`); project-specific skills/agents → **project** scope (workspace repo `.claude/...`); instructions → `CLAUDE.md` (project) or user instructions. Resolve the concrete `targetPath`, read `currentContent` (if the file exists), set `proposedContent`, and compute a `diff`. Persist as `status = staged`. **Never write to disk here.**
- **Acceptance criteria:** Every finding routes to exactly one correct scope/path; generic skills never route to a project and project-specific skills never route to user scope; diffs computed; nothing written to disk.
- **Test requirements:** Vitest tests: routing matrix (generic vs project-specific vs instructions), path resolution for both scopes, diff generation, and an assertion that no filesystem write occurs during staging.
- **Done definition:** Tests green.

## P8-T5 — Apply / discard improvements

- **Goal:** Apply a staged improvement to disk, or discard it, idempotently.
- **Depends on:** P8-T4.
- **Files:** `apps/server/src/services/analysis/applyImprovement.ts`, tests.
- **Implementation notes:** `apply` writes `proposedContent` to `targetPath` at the resolved scope (creating parent dirs as needed), then sets `status = applied` with `appliedAt`. `discard` sets `status = discarded` and changes nothing on disk. Both are idempotent (re-applying/re-discarding is safe). Guard against writing outside the intended scope roots.
- **Acceptance criteria:** Apply writes exactly the target file at the correct scope and updates status; discard leaves disk untouched; both idempotent; path traversal outside scope roots is prevented.
- **Test requirements:** Vitest tests using a temp filesystem: apply writes correct file/content, discard is a no-op, idempotency, and a path-escape attempt is rejected.
- **Done definition:** Tests green.

## P8-T6 — Analysis API endpoints (+ SSE)

- **Goal:** Create analyses, stream progress, fetch results, and apply/discard improvements.
- **Depends on:** P8-T3, P8-T4, P8-T5; Phase 2 P2-T3.
- **Files:** `apps/server/src/routes/analyses.ts`, `apps/server/src/routes/improvements.ts`, tests.
- **Implementation notes:** `POST /api/analyses` (over selected `sessionIds`), `GET /api/analyses/:id` (with staged improvements), `GET /api/analyses/:id/stream` (SSE), `POST /api/improvements/:id/apply`, `POST /api/improvements/:id/discard`. Validate inputs; require at least one valid session.
- **Acceptance criteria:** Creating an analysis runs the pipeline and returns staged improvements; stream emits progress; apply/discard endpoints perform the service actions and reflect status.
- **Test requirements:** Vitest route tests with fake SDK + temp FS: create→findings→staged, stream progress, apply, discard, and validation failures.
- **Done definition:** Tests green.

## P8-T7 — Analysis UI (trigger + review diffs)

- **Goal:** Trigger analysis from selected sessions and review/apply/discard staged improvements.
- **Depends on:** P8-T6; Phase 7 P7-T4; Phase 5 P5-T4.
- **Files:** `apps/web/src/routes/AnalysisPage.tsx`, `apps/web/src/components/analysis/ImprovementCard.tsx`, `apps/web/src/components/analysis/DiffView.tsx`, tests.
- **Implementation notes:** "Analyze selected" on the sessions list starts an analysis and opens the analysis view, streaming progress. Results are grouped by category and scope, each rendered as a diff with clear scope/target labels and Apply/Discard actions. Reflect applied/discarded state; show empty state when no improvements are found.
- **Acceptance criteria:** Selecting sessions and analyzing shows grouped staged improvements as diffs with correct scope/target labels; apply/discard update state; empty state handled.
- **Test requirements:** Vitest + Testing Library with mocked client/stream: grouped diff rendering, apply, discard, empty state.
- **Done definition:** Tests green; manual verification end to end.
