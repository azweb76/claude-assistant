# AGENTS.md

Operating guide for AI agents (and humans) contributing to **claude-assistant**. Read this before touching code, then read the active phase in [`docs/backlog/`](docs/backlog/README.md).

## What this project is

A local-first, single-user web app that drives the Claude Agent SDK to open PRs on GitHub repos, and analyzes its own sessions to suggest improvements to instructions and skills. See [`README.md`](README.md) and [`docs/product-spec.md`](docs/product-spec.md).

## Golden rules

1. **The backlog is the source of truth.** Implement one task at a time from the current phase. Do not skip ahead across a phase dependency boundary.
2. **Satisfy the task contract.** Every task lists acceptance criteria and test requirements. A task is done only when both are met and the suite is green.
3. **ESM only.** No CommonJS. Use `import`/`export`, `"type": "module"`, and `.js` extension in relative import specifiers where the compiler requires it (`NodeNext`).
4. **Type-safe end to end.** Shared types live in `packages/shared` and are imported by both server and web. No `any` in committed code without an inline justification.
5. **Never store secrets.** No API keys or tokens in code, config, DB, or logs. Anthropic auth is delegated to Claude Code; GitHub auth reuses local `gh`/`git` credentials. See [`docs/decisions.md`](docs/decisions.md).
6. **Conventional Commits, one logical change per commit.** e.g. `feat(server): add session runner`, `test(db): cover workspace repository`, `docs(backlog): add phase 4 tasks`.
7. **Do not weaken tests or types to make something pass.** Fix the root cause.

## Planned monorepo layout

```
claude-assistant/
├── apps/
│   ├── server/            # Fastify backend (agent runner, git/gh, analysis, API)
│   └── web/               # Vite + React + MUI v9 frontend
├── packages/
│   └── shared/            # Shared TS types, zod schemas, constants
├── docs/                  # Product spec, architecture, decisions, backlog
├── package.json           # workspace root scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Directories under `apps/` and `packages/` are created in Phase 0. Until then this describes the target, not the current state.

## Canonical commands

Run from the repo root. These are the contracts every phase must keep working (implemented in Phase 0).

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install all workspace dependencies. |
| `pnpm dev` | Run server + web together for local development. |
| `pnpm --filter @claude-assistant/server dev` | Run only the backend. |
| `pnpm --filter @claude-assistant/web dev` | Run only the frontend. |
| `pnpm test` | Run the full Vitest suite across workspaces. |
| `pnpm --filter <pkg> test` | Run tests for one workspace. |
| `pnpm lint` | ESLint + Prettier check. |
| `pnpm typecheck` | `tsc --noEmit` across workspaces. |
| `pnpm build` | Build all workspaces. |
| `pnpm db:generate` / `pnpm db:migrate` | Generate and apply Drizzle migrations. |

If you add a new required check, document it here in the same commit.

## Testing expectations

- **Framework:** Vitest for unit and integration tests across all workspaces.
- **Unit tests** are required for pure logic: data-access repositories, profile→SDK option mapping, transcript parsing, analysis heuristics, scope routing.
- **Integration tests** cover API routes (Fastify inject), git/gh wrappers (against a temporary sandbox repo or mocked child process), and DB migrations.
- **External services are never hit in tests.** Mock the Claude Agent SDK and `gh`/`git`; use a fresh temp SQLite DB per test file.
- **Manual/e2e** verification for UI-affecting work: run `pnpm dev`, exercise the flow, and capture evidence. Phase 9 adds an automated happy-path e2e.
- A change that affects the UI must be verified in the running UI, not just unit-tested.

## Coding conventions

- **Language/runtime:** TypeScript strict mode, Node 22+, ESM. Target `NodeNext` module resolution on the server; `bundler` resolution on the web app (Vite).
- **Validation:** validate all external input (HTTP bodies, SDK/CLI output boundaries) with zod schemas defined in `packages/shared`.
- **Errors:** throw typed errors; map to structured HTTP responses at the Fastify layer. Never leak stack traces to the client in normal responses.
- **Async streaming:** the agent run is streamed to the UI via Server-Sent Events (SSE). Keep transcript events append-only and persisted as they arrive.
- **No narrating comments.** Comment only non-obvious intent, trade-offs, or constraints.
- **Formatting:** Prettier is authoritative; do not hand-format. Lint must pass.

## Claude Agent SDK integration notes

- Entry point is `query({ prompt, options })` from `@anthropic-ai/claude-agent-sdk`; it returns an async iterable of typed messages. Iterate and persist each message.
- Agent-profile fields map onto `Options`: `model`, `effort` (`low|medium|high|xhigh|max`), `permissionMode` (`default|acceptEdits|bypassPermissions|plan`), `allowedTools`/`disallowedTools`, `skills`, `agents`, `cwd` (the cloned workspace path), `maxTurns`, `maxBudgetUsd`.
- Set `settingSources` to include `'user'` so the SDK loads `~/.claude/settings.json` and user-scope skills/auth (`apiKeyHelper`, OAuth). Include `'project'` to pick up the workspace's `.claude/` and `CLAUDE.md`.
- Capture `session_id` from the init/result messages to support `resume`. Persist `total_cost_usd` and token usage from result messages — these feed the analysis engine.
- `bypassPermissions` additionally requires `allowDangerouslySkipPermissions: true`; surface this clearly in the UI and never make it a silent default.

## How to consume the backlog

1. Open [`docs/backlog/README.md`](docs/backlog/README.md) and find the lowest-numbered phase that is not complete.
2. Pick the first unblocked task (its `depends on` tasks are done).
3. Implement strictly within the task's `files to create/modify` scope; if you must exceed it, note why in the commit.
4. Write the tests named in `test requirements`, make the suite pass, run `pnpm lint` and `pnpm typecheck`.
5. Commit with a Conventional Commit message referencing the task id (e.g. `feat(db): P1-T2 add workspace schema`).

## Do / Don't

- Do keep `install` and setup idempotent and non-interactive.
- Do prefer the repo's pinned tool versions and lockfile; don't do broad upgrades.
- Don't introduce a second base-image/auth/storage strategy; the decisions in [`docs/decisions.md`](docs/decisions.md) are settled unless a new ADR supersedes them.
- Don't add CommonJS, default-export barrels that hide types, or runtime API-key handling.
