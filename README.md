# claude-assistant

A local-first web application that uses the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/typescript) to open pull requests on GitHub repositories — and continuously improves how it works by analyzing its own agent sessions for waste and inefficiency.

## What it does

1. **Add a workspace** — point the app at a GitHub repository. The repo is cloned locally using your existing `git`/`gh` credentials.
2. **Create an agent profile** — a reusable, fully configurable bundle of Claude Agent SDK settings (model, effort, permission mode, authorized tools, skills, limits).
3. **Start a session** — provide a prompt plus a workspace and an agent profile. The SDK runs against the clone, streams progress to the UI, and opens a PR when done.
4. **Analyze and improve** — select sessions, run analysis, and review **staged** improvements (instructions / project skills / user skills) as diffs you apply or discard.

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
| [`AGENTS.md`](AGENTS.md) | How AI agents build, test, and contribute |
| [`docs/product-spec.md`](docs/product-spec.md) | Features and user flows |
| [`docs/architecture.md`](docs/architecture.md) | System design and API surface |
| [`docs/decisions.md`](docs/decisions.md) | ADRs |
| [`docs/backlog/`](docs/backlog/) | Phased implementation backlog |

## Improvement loop

Sessions store append-only transcripts and usage. Analysis extracts waste metrics, asks a review agent for structured findings, routes each finding to **user** (`~/.claude`) or **project** (repo `.claude` / `CLAUDE.md`) scope, and stages a diff. Apply writes the file; discard does not.
