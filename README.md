# claude-assistant

A local-first web application that uses the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/typescript) to open pull requests on GitHub repositories — and continuously improves how it works by analyzing its own agent sessions for waste and inefficiency.

## What it does

1. **Add a workspace** — point the app at a GitHub repository. The repo is cloned locally using your existing `git`/`gh` credentials.
2. **Create an agent profile** — a reusable, fully configurable bundle of Claude Agent SDK settings (model, effort, permission mode, authorized tools, skills, limits). Profiles are managed independently of sessions.
3. **Start a session** — provide a prompt plus a workspace and an agent profile. The reusable chat drives the full Claude Agent SDK surface (streaming, tools, permissions, AskUserQuestion, MCP, plan mode, slash commands, attachments, reload). On success the runner opens a PR.
4. **Analyze and improve** — from the sessions list, select one or more sessions and run an analysis pass. The engine reviews the transcripts for waste and inefficiency and produces **staged** (reviewable, not-yet-applied) improvements to:
   - Claude instructions (`CLAUDE.md`),
   - project skills/agents (only when the improvement is specific to that project, written to the repo's `.claude/`),
   - user skills/agents (generic capabilities like plan/implement/code-review, written to user scope `~/.claude/`).

## Core principles

- **Local-first, single-user.** Backend and web UI run on localhost. No accounts or multi-tenancy.
- **Bring your own auth.** Anthropic access is delegated to Claude Code; GitHub access reuses local `gh`/`git` credentials. The app never stores API keys or tokens.
- **Everything configurable.** Agent settings are exposed through profiles and app settings.
- **Manual improvement loop.** Analysis is explicit; staged improvements are never auto-applied.

## Tech stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript, ESM-only |
| Package manager / repo | pnpm workspaces |
| Backend | Node + Fastify |
| Agent runtime | `@anthropic-ai/claude-agent-sdk` |
| Git/GitHub | local `git` + `gh` CLI |
| Frontend | Vite + React + MUI v9 (light/dark) |
| Persistence | SQLite via Drizzle ORM |
| Testing | Vitest (+ API happy-path e2e) |

## Quickstart

Prerequisites: Node 22+, pnpm, working `gh auth status`, and Claude Code auth (or credentials resolvable via `~/.claude/settings.json`).

```bash
pnpm install
pnpm db:migrate          # optional; also runs on server boot
pnpm dev                 # API on :3001, web on :5173 (proxied /api)
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
```

Open http://127.0.0.1:5173 — use Workspaces → Profiles → New session → Sessions → Analysis.

## Documentation map

| Document | Purpose |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | How AI agents (and humans) build, test, and contribute; conventions and canonical commands. |
| [`docs/product-spec.md`](docs/product-spec.md) | Features, user flows, entities, and non-goals. |
| [`docs/chat-feature-catalog.md`](docs/chat-feature-catalog.md) | Binding list of every SDK message, tool, control, and interrupt the session chat must support. |
| [`docs/architecture.md`](docs/architecture.md) | System design, monorepo layout, data model, API/SSE surface, agent runner, analysis/staging design. |
| [`docs/decisions.md`](docs/decisions.md) | Architecture decision records (ADRs) for the choices that shape the project. |
| [`docs/backlog/README.md`](docs/backlog/README.md) | Backlog overview: task schema, phase index, and dependency graph. |
| [`docs/backlog/`](docs/backlog/) | One file per phase, each with granular, independently implementable tasks. |

## Improvement loop

Sessions store append-only transcripts and usage. Analysis extracts waste metrics, asks a review agent for structured findings, routes each finding to **user** (`~/.claude`) or **project** (repo `.claude` / `CLAUDE.md`) scope, and stages a diff. Apply writes the file; discard does not.
