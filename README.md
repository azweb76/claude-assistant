# claude-assistant

A local-first web application that uses the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/typescript) to contribute one or more pull requests to GitHub repositories — and then continuously improves the way it works by analyzing its own agent sessions for waste and inefficiency.

> Status: **planning**. This repository currently contains the product backlog and AI-development guardrails only. No application code has been written yet. The backlog under [`docs/backlog/`](docs/backlog/README.md) is the source of truth for what gets built and in what order.

## What it does

1. **Add a workspace** — point the app at a GitHub repository. The repo is cloned locally using your existing `git`/`gh` credentials.
2. **Create an agent profile** — a reusable, fully configurable bundle of Claude Agent SDK settings (model, effort, permission mode, authorized tools, skills, limits). Profiles are managed independently of sessions.
3. **Start a session** — provide a prompt plus a workspace and an agent profile. The Claude Agent SDK runs the agent loop against the cloned repo, streams progress to the UI, and opens a PR when done.
4. **Analyze and improve** — from the sessions list, select one or more sessions and run an analysis pass. The engine reviews the transcripts for waste and inefficiency and produces **staged** (reviewable, not-yet-applied) improvements to:
   - Claude instructions (`CLAUDE.md`),
   - project skills/agents (only when the improvement is specific to that project, written to the repo's `.claude/`),
   - user skills/agents (generic capabilities like plan/implement/code-review, written to user scope `~/.claude/`).

## Core principles

- **Local-first, single-user.** Backend and web UI run on your machine (localhost). No accounts, no multi-tenancy.
- **Bring your own auth.** Anthropic access is delegated to Claude Code (OAuth login / `apiKeyHelper` / `~/.claude/settings.json`); GitHub access reuses your local `gh`/`git` credentials. The app never stores API keys or tokens.
- **Everything configurable.** All agent settings are exposed and editable through agent profiles and app settings.
- **Optimized for AI development.** The codebase, conventions, and backlog are structured so AI agents can implement, test, and extend the app with minimal ambiguity.

## Tech stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript, ESM-only |
| Package manager / repo | pnpm workspaces (monorepo) |
| Backend | Node + Fastify |
| Agent runtime | `@anthropic-ai/claude-agent-sdk` |
| Git/GitHub | local `git` + `gh` CLI |
| Frontend | Vite + React + MUI v9 (light/dark themes) |
| Persistence | SQLite via Drizzle ORM |
| Testing | Vitest |

## Documentation map

| Document | Purpose |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | How AI agents (and humans) build, test, and contribute; conventions and canonical commands. |
| [`docs/product-spec.md`](docs/product-spec.md) | Features, user flows, entities, and non-goals. |
| [`docs/architecture.md`](docs/architecture.md) | System design, monorepo layout, data model, API/SSE surface, agent runner, analysis/staging design. |
| [`docs/decisions.md`](docs/decisions.md) | Architecture decision records (ADRs) for the choices that shape the project. |
| [`docs/backlog/README.md`](docs/backlog/README.md) | Backlog overview: task schema, phase index, and dependency graph. |
| [`docs/backlog/`](docs/backlog/) | One file per phase, each with granular, independently implementable tasks. |

## Quickstart (planned)

These commands describe the intended developer experience once Phase 0 lands. They do not work yet.

```bash
pnpm install          # install workspace dependencies
pnpm dev              # run backend + web UI together (localhost)
pnpm test             # run the Vitest suite
pnpm lint             # lint and format-check
pnpm build            # build all workspaces
```

Prerequisites (planned): Node 22+, pnpm, a working `gh` CLI login (`gh auth status`), and a Claude Code login (`claude` authenticated, or `ANTHROPIC_API_KEY` resolvable via your Claude Code settings).

## For AI contributors

Start at [`AGENTS.md`](AGENTS.md), then read the current phase in [`docs/backlog/`](docs/backlog/README.md). Implement one task at a time, satisfy its acceptance criteria and test requirements, and use [Conventional Commits](https://www.conventionalcommits.org/) for every commit.
