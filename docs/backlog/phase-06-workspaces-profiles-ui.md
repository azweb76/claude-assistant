# Phase 6 — Workspaces & Agent Profiles UI

**Theme:** Full UI for adding/removing GitHub-repo workspaces and managing agent profiles with every configurable SDK setting.

**Depends on:** Phase 3 (workspace API), Phase 5 (frontend foundation). Profiles UI also needs the profile API — see note in P6-T3.

**Exit criteria:** A user can add and remove workspaces and perform full CRUD on agent profiles from the UI, editing all supported settings, with validation and clear feedback.

---

## P6-T1 — Profile API endpoints (backend)

- **Goal:** Expose agent-profile CRUD over HTTP (the backend counterpart the UI needs).
- **Depends on:** Phase 1 P1-T3; Phase 2 P2-T2.
- **Files:** `apps/server/src/routes/profiles.ts`, tests.
- **Implementation notes:** `GET/POST /api/profiles`, `GET/PUT/DELETE /api/profiles/:id`. Validate with shared schemas; protect built-in profiles from deletion (or allow duplicate-then-edit). Deleting a profile referenced by sessions must not break history (sessions keep their snapshot).
- **Acceptance criteria:** CRUD works and validates; built-ins protected per policy; deleting a used profile leaves session history intact.
- **Test requirements:** Vitest route tests: CRUD, validation failure, built-in protection, delete-with-history safety.
- **Done definition:** Tests green.

## P6-T2 — Workspaces page

- **Goal:** List, add, and remove workspaces.
- **Depends on:** Phase 3 P3-T5; Phase 5 P5-T2, P5-T3.
- **Files:** `apps/web/src/routes/WorkspacesPage.tsx`, `apps/web/src/components/workspaces/*`, tests.
- **Implementation notes:** List shows name, remote, default branch, and local path. "Add workspace" dialog takes a repo ref, shows progress while verifying/cloning, and surfaces errors (no access, bad ref). Remove has a confirm dialog and optional "delete clone" toggle.
- **Acceptance criteria:** Adding a valid repo shows it in the list; add errors are shown without creating a broken entry; remove works with confirmation.
- **Test requirements:** Vitest + Testing Library with mocked client: add success, add error, list render, remove flow.
- **Done definition:** Tests green; manual verification.

## P6-T3 — Agent profiles page

- **Goal:** Full CRUD UI for agent profiles.
- **Depends on:** P6-T1; Phase 5 P5-T2, P5-T3.
- **Files:** `apps/web/src/routes/ProfilesPage.tsx`, `apps/web/src/components/profiles/ProfileForm.tsx`, tests.
- **Implementation notes:** Form exposes every setting: `model`, `effort` (select), `permissionMode` (select; `bypassPermissions` disabled unless `allowBypassPermissions` is on), `allowedTools`/`disallowedTools` (editable lists), `skills`, `agents`, `settingSources` (multi-select), `maxTurns`, `maxBudgetUsd`, `extraSystemPrompt`. Built-ins are read-only but duplicable. Validate against the shared schema before submit.
- **Acceptance criteria:** Create/edit/delete/duplicate work; all fields persist and reload; `bypassPermissions` gated by the setting; validation errors shown inline.
- **Test requirements:** Vitest + Testing Library with mocked client: create, edit, delete, duplicate, bypass-gating, validation errors.
- **Done definition:** Tests green; manual verification.

## P6-T4 — Reusable form controls for SDK settings

- **Goal:** Shared, tested inputs for tools lists, skills, effort, permission mode, and setting sources.
- **Depends on:** P6-T3.
- **Files:** `apps/web/src/components/profiles/controls/*`, tests.
- **Implementation notes:** Extract the non-trivial controls (tool allow/deny editors, skills selector, setting-sources multi-select) into reusable components so they can also be used for per-session overrides later. Keep them controlled and schema-aligned.
- **Acceptance criteria:** Controls emit valid values, handle empty/error states, and are reused by the profile form.
- **Test requirements:** Vitest + Testing Library unit tests per control (value changes, validation display).
- **Done definition:** Tests green.
