# Phase 3 — Git + GitHub integration

**Theme:** Clone repos, manage branches/commits/pushes, and open PRs using the machine's local `git`/`gh` — plus the workspace endpoints that use them.

**Depends on:** Phase 1, Phase 2

**Exit criteria:** A workspace can be added (verified + cloned) and removed via the API; the git service can create a branch, commit, push, and open a PR; all shell interaction is mockable and tested without hitting GitHub.

Reference: git/GitHub service in [`../architecture.md`](../architecture.md#6-git--github-service) and ADR-0005 in [`../decisions.md`](../decisions.md#adr-0005--github-auth-via-local-ghgit-credentials).

---

## P3-T1 — Mockable command executor

- **Goal:** A thin, injectable wrapper for running `git`/`gh` subprocesses safely.
- **Depends on:** —
- **Files:** `apps/server/src/services/git/executor.ts`, tests.
- **Implementation notes:** Wrap `execFile` (argument arrays, never a shell string) so untrusted values are never interpolated into a shell. Return `{ stdout, stderr, code }`; surface non-zero exits as `ExternalCommandError`. The executor is injected via the Phase 2 DI container so tests substitute a fake.
- **Acceptance criteria:** Executes with an args array; rejects/raises on non-zero exit; no shell interpolation path exists.
- **Test requirements:** Vitest tests using a fake executor for success and failure; one real test against a harmless command (e.g. `git --version`) guarded so CI can run it.
- **Done definition:** Tests green.

## P3-T2 — Git service (clone, branch, commit, push)

- **Goal:** High-level git operations over the executor.
- **Depends on:** P3-T1.
- **Files:** `apps/server/src/services/git/gitService.ts`, tests.
- **Implementation notes:** Operations: `verifyAccess(remote)`, `clone(remote, dest)`, `getDefaultBranch`, `fetchAndReset(branch)`, `createBranch(name)`, `stageAll`, `commit(message)`, `push(branch)`, `hasChanges()`. Branch names are unique per session (e.g. `claude-assistant/<session-short-id>`). Serialize writes per clone.
- **Acceptance criteria:** Each operation issues the correct `git` args; `hasChanges` reflects working-tree state; errors propagate as typed errors.
- **Test requirements:** Vitest tests asserting the exact arg arrays via a fake executor; an integration test against a temporary local git repo (init, commit, branch) with no network.
- **Done definition:** Tests green.

## P3-T3 — GitHub service (PRs via `gh`)

- **Goal:** Open and describe PRs using the `gh` CLI.
- **Depends on:** P3-T1.
- **Files:** `apps/server/src/services/git/githubService.ts`, tests.
- **Implementation notes:** `createPullRequest({ cwd, base, head, title, body })` shells `gh pr create` and parses the returned PR URL; `checkAuth()` wraps `gh auth status`. No token handling in-app.
- **Acceptance criteria:** PR creation issues correct `gh` args and returns the parsed URL; auth check reports login state; failures are typed errors with actionable messages.
- **Test requirements:** Vitest tests with a fake executor for success (URL parsed) and auth-failure paths.
- **Done definition:** Tests green.

## P3-T4 — Workspace service (clone lifecycle)

- **Goal:** Tie the git service to the workspace repository and managed clone directory.
- **Depends on:** P3-T2; Phase 1 P1-T2; Phase 1 P1-T6 (clone dir setting).
- **Files:** `apps/server/src/services/workspaces/workspaceService.ts`, tests.
- **Implementation notes:** `addWorkspace(ref)` normalizes the ref, verifies access, clones into `<managedDir>/<owner>-<repo>`, records `defaultBranch` and `localPath`, and persists. `removeWorkspace(id)` deletes the row and (optionally, per setting) the clone directory. Adding must be transactional-ish: a failed clone leaves no half-created workspace row.
- **Acceptance criteria:** Successful add clones + persists a complete workspace; failed verify/clone creates no row; remove deletes the row (and clone if configured).
- **Test requirements:** Vitest tests with mocked git service: success creates a row; clone failure creates none; remove path covered.
- **Done definition:** Tests green.

## P3-T5 — Workspace API endpoints

- **Goal:** Expose workspace CRUD over HTTP.
- **Depends on:** P3-T4; Phase 2 P2-T2.
- **Files:** `apps/server/src/routes/workspaces.ts`, tests.
- **Implementation notes:** `POST /api/workspaces` (add), `GET /api/workspaces` (list), `GET /api/workspaces/:id`, `DELETE /api/workspaces/:id`. Validate with shared schemas; map service errors (no access, bad ref) to structured responses.
- **Acceptance criteria:** Endpoints perform the documented actions; error cases return structured errors; list/get reflect persisted state.
- **Test requirements:** Vitest route tests with a mocked workspace service covering add success, add failure (no access), list, get, delete.
- **Done definition:** Tests green.
