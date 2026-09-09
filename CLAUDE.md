# CLAUDE.md

Instructions for Claude when working in the **claude-assistant** repository. This complements [`AGENTS.md`](AGENTS.md) — read both.

## Context

claude-assistant is a local-first, single-user web app that uses the Claude Agent SDK to open PRs on GitHub repositories and analyzes its own sessions to propose improvements to instructions and skills. This repo is currently in the planning stage: it contains a phased backlog and documentation, not application code. Build strictly according to [`docs/backlog/`](docs/backlog/README.md).

## Working agreement

- **Follow the backlog.** Implement the lowest-numbered incomplete phase, one unblocked task at a time. Respect each task's `files to create/modify`, `acceptance criteria`, and `test requirements`.
- **ESM + TypeScript strict** throughout. No CommonJS. Shared types live in `packages/shared`.
- **Test what you build.** Use Vitest. Mock the Claude Agent SDK, `git`, and `gh`; never hit real external services in tests. UI-affecting work must be verified in the running app.
- **Conventional Commits**, one logical change per commit, referencing the task id.
- **Never store secrets.** Delegate Anthropic auth to Claude Code (`settingSources` includes `'user'`); use local `gh`/`git` credentials for GitHub. No keys or tokens in code, config, DB, or logs.
- **Do not weaken types or tests** to force a pass. Fix root causes.

## Key commands

`pnpm install` · `pnpm dev` · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm build` · `pnpm db:generate` · `pnpm db:migrate`. See [`AGENTS.md`](AGENTS.md) for the full table (available after Phase 0).

## SDK reminders

- Session chat implements **all** of [`docs/chat-feature-catalog.md`](docs/chat-feature-catalog.md) (every `SDKMessage`, tool card, Query control, blocking prompt). Permissions and AskUserQuestion are included, not the ceiling.
- Use streaming-input `query({ prompt, options })` from `@anthropic-ai/claude-agent-sdk`; persist each message; keep `Query` for interrupt/controls; `canUseTool` must wait on the user and survive browser reload via `pending_user_inputs`.
- Map agent profiles to `Options` (`model`, `effort`, `permissionMode`, `allowedTools`/`disallowedTools`, `skills`, `agents`, `cwd`, `maxTurns`, `maxBudgetUsd`) plus chat flags (`includePartialMessages`, `forwardSubagentText`, checkpointing, AskUserQuestion previews).
- Persist `session_id`, token usage, and `total_cost_usd`; these feed the analysis engine.

## Pointers

- Product scope and flows: [`docs/product-spec.md`](docs/product-spec.md)
- Chat catalog (binding): [`docs/chat-feature-catalog.md`](docs/chat-feature-catalog.md)
- System design and data model: [`docs/architecture.md`](docs/architecture.md)
- Settled decisions (ADRs): [`docs/decisions.md`](docs/decisions.md)

## Pointers

- Product scope and flows: [`docs/product-spec.md`](docs/product-spec.md)
- System design and data model: [`docs/architecture.md`](docs/architecture.md)
- Settled decisions (ADRs): [`docs/decisions.md`](docs/decisions.md)
