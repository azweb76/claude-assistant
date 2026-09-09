# Architecture Decision Records

These ADRs record the settled decisions that shape claude-assistant. They are binding: implement against them. Superseding a decision requires adding a new ADR here (with a higher number) that marks the old one as superseded.

Status legend: **Accepted** · Proposed · Superseded.

---

## ADR-0001 — Local-first, single-user tool

**Status:** Accepted

**Context.** The app must run the Claude Agent SDK and `git`/`gh`, which require a server-side Node runtime. The intended user runs it on their own machine.

**Decision.** Ship a local-first, single-user application: a Fastify backend and a Vite/React web UI, both on localhost. No authentication, authorization, accounts, or multi-tenancy.

**Consequences.** Simpler design (no auth, no per-user isolation). Privileged operations (SDK, shell, filesystem) live only in the backend. Not deployable as a shared hosted service without a future ADR.

---

## ADR-0002 — TypeScript + ESM, pnpm monorepo, Vitest

**Status:** Accepted

**Context.** The stack is TypeScript with ESM. Backend and frontend share types. Tests use Vitest.

**Decision.** Use a pnpm-workspaces monorepo (`apps/server`, `apps/web`, `packages/shared`), ESM-only, TypeScript strict. `NodeNext` resolution on the server, `bundler` resolution on the web. Vitest is the single test framework.

**Consequences.** Shared zod schemas/types are imported by both apps. No CommonJS. Consistent tooling and one test runner.

---

## ADR-0003 — SQLite via Drizzle ORM

**Status:** Accepted

**Context.** The app needs queryable structured storage for workspaces, profiles, sessions, transcripts, analyses, and staged improvements, with zero external infrastructure.

**Decision.** Use SQLite as the datastore and Drizzle ORM + `drizzle-kit` for schema and migrations. One DB file in the app data directory.

**Consequences.** No DB server to run; easy migrations and typed queries. Analytics-style queries over transcripts are supported. Filesystem (clones, `.claude` files) remains separate from the DB.

---

## ADR-0004 — Anthropic auth delegated to Claude Code

**Status:** Accepted

**Context.** The user wants to use their existing Claude Code authentication (OAuth login, `apiKeyHelper`, `~/.claude/settings.json`) rather than have the app manage API keys.

**Decision.** The app never stores or manages Anthropic API keys. The runner sets SDK `settingSources` to include `'user'` so the SDK loads `~/.claude/settings.json` and resolves auth exactly as Claude Code does. Including `'project'` additionally loads the workspace's `.claude/` and `CLAUDE.md`.

**Consequences.** No key-management UI or secret storage. Auth "just works" if the user is logged into Claude Code. The app depends on the SDK's settings-resolution behavior. Loading `'user'` settings also makes user-scope skills available to runs.

---

## ADR-0005 — GitHub auth via local `gh`/`git` credentials

**Status:** Accepted

**Context.** Local-first, single-user, and consistent with delegating Anthropic auth. The user already has `gh`/`git` configured.

**Decision.** Clone/fetch/push using the machine's local `git` credentials, and create PRs with the `gh` CLI. The app stores no GitHub tokens and provides no token UI.

**Consequences.** No secret handling for GitHub. Requires a working `gh auth status`. All GitHub/git access goes through a thin, mockable command wrapper (no unsafe input interpolation).

---

## ADR-0006 — Backend: Fastify with REST + SSE

**Status:** Accepted

**Context.** The UI needs standard CRUD plus live streaming of long-running agent runs and analyses.

**Decision.** Use Fastify (ESM) for the backend. CRUD is REST/JSON validated with shared zod schemas; live progress is delivered via Server-Sent Events. Expose `buildApp()` for `inject`-based tests.

**Consequences.** SSE is simpler than WebSockets for one-way server→client streaming and fits the transcript model. Route tests run without a network via `fastify.inject`.

---

## ADR-0007 — Frontend: Vite + React + MUI v9 with CSS theme variables

**Status:** Accepted

**Context.** The UI must use MUI v9 and support light and dark themes.

**Decision.** Build the web app with Vite + React and MUI v9. Theme with `createTheme({ cssVariables: true, colorSchemes: { light, dark } })` and provide a manual light/dark toggle (not media-query-only), using `theme.applyStyles()` for scheme-specific styles rather than `palette.mode`.

**Consequences.** No dark-mode flicker, tab-synced color scheme, and a clean toggle. Styling follows the CSS-variables approach documented by MUI v9.

---

## ADR-0008 — Agent profiles snapshot into sessions

**Status:** Accepted

**Context.** Profiles are editable and deletable, but historical sessions must remain an accurate record of how they ran (and feed analysis reliably).

**Decision.** When a session starts, freeze the effective profile settings into `sessions.profileSnapshot`. Analysis and history read the snapshot, not the live profile.

**Consequences.** Editing or deleting a profile never rewrites history. Slight duplication of settings per session, which is acceptable and intentional.

---

## ADR-0009 — Manual analysis with staged, scope-routed improvements

**Status:** Accepted

**Context.** The improvement loop must be deliberate and safe. Improvements target three categories across two scopes, and generic vs project-specific skills must not be mixed up.

**Decision.** Analysis is manual: the user selects one or more sessions and triggers it. The engine produces **staged** improvements (never auto-applied) in three categories — `claude_instructions`, `project_skill_agent`, `user_skill_agent` — routed to the correct scope: generic capabilities (plan, implement, code review, etc.) to **user** scope (`~/.claude`); project-specific skills/agents to **project** scope (repo `.claude`); instructions to `CLAUDE.md` or user instructions as the finding dictates. Each staged improvement is a reviewable diff the user applies or discards individually. Applying writes to disk; discarding does not.

**Consequences.** No unattended writes. Scope routing is enforced and unit-tested. Staged improvements persist with a `staged → applied|discarded` lifecycle so the review UI is stateful and idempotent.

---

## ADR-0010 — Documentation-first, AI-optimized backlog

**Status:** Accepted

**Context.** The first iteration is a backlog to be consumed by AI agents, and the project must be optimized for AI-driven development.

**Decision.** Deliver `README.md`, `AGENTS.md`/`CLAUDE.md`, `docs/product-spec.md`, `docs/architecture.md`, this ADR log, and a phased `docs/backlog/` where every task has an explicit contract (goal, dependencies, file targets, acceptance criteria, test requirements, done definition). No application code in this iteration.

**Consequences.** AI agents can implement phases with minimal ambiguity. The backlog and ADRs are the source of truth; code phases must conform to them.
