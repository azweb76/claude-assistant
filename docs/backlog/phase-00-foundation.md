# Phase 0 — Foundation & AI optimization

**Theme:** Stand up the pnpm monorepo, TypeScript/ESM tooling, Vitest, linting, and the canonical scripts that every later phase relies on.

**Depends on:** —

**Exit criteria:** `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all succeed from a clean checkout; `pnpm dev` starts both apps; a trivial shared type is imported by both `server` and `web`.

---

## P0-T1 — Initialize pnpm workspace and root config

- **Goal:** Create the monorepo skeleton so packages can be added and share config.
- **Depends on:** —
- **Files:** `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.gitignore`, `.nvmrc` (or `.node-version`), `tsconfig.base.json`.
- **Implementation notes:** Root `package.json` is `private: true`, `"type": "module"`, pins Node 22+ via `engines`, and pins pnpm via `packageManager`. `pnpm-workspace.yaml` includes `apps/*` and `packages/*`. `tsconfig.base.json` sets strict mode and shared compiler options; app tsconfigs extend it. `.gitignore` covers `node_modules`, build outputs, SQLite files, and `.env*`.
- **Acceptance criteria:** `pnpm install` succeeds with no packages yet; `tsconfig.base.json` compiles as valid config; workspace globs resolve.
- **Test requirements:** N/A (config). Verify by running `pnpm install` and `pnpm -r exec true`.
- **Done definition:** Clean install works; files committed with a Conventional Commit.

## P0-T2 — Create `packages/shared`

- **Goal:** A shared package for zod schemas, inferred types, and constants used by both apps.
- **Depends on:** P0-T1.
- **Files:** `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/constants.ts`, `packages/shared/vitest.config.ts`, `packages/shared/src/__tests__/smoke.test.ts`.
- **Implementation notes:** Name `@claude-assistant/shared`, ESM, builds with `tsc`. Export a placeholder constant and type to prove wiring. Add `zod` dependency for later phases.
- **Acceptance criteria:** Package builds; its exports are importable by other workspaces via the package name.
- **Test requirements:** Vitest smoke test asserting an exported constant's value.
- **Done definition:** Build + test green; importable from another workspace.

## P0-T3 — Scaffold `apps/server`

- **Goal:** A minimal Fastify server entry that boots and exposes `GET /api/health`.
- **Depends on:** P0-T1, P0-T2.
- **Files:** `apps/server/package.json`, `apps/server/tsconfig.json`, `apps/server/src/index.ts`, `apps/server/src/app.ts`, `apps/server/vitest.config.ts`, `apps/server/src/__tests__/health.test.ts`.
- **Implementation notes:** Name `@claude-assistant/server`, ESM, `NodeNext` resolution. `buildApp()` in `app.ts` returns a configured Fastify instance (no `listen`); `index.ts` calls `listen`. `dev` script runs with `tsx` (or equivalent) watch. Import the placeholder from `@claude-assistant/shared` to prove cross-package imports.
- **Acceptance criteria:** `GET /api/health` returns `200` with a JSON body; server starts via `pnpm --filter @claude-assistant/server dev`.
- **Test requirements:** Vitest + `fastify.inject` test for `/api/health`.
- **Done definition:** Health test green; server boots locally.

## P0-T4 — Scaffold `apps/web`

- **Goal:** A minimal Vite + React app that renders and can call the server.
- **Depends on:** P0-T1, P0-T2.
- **Files:** `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/vitest.config.ts`, `apps/web/src/__tests__/App.test.tsx`.
- **Implementation notes:** Name `@claude-assistant/web`, React + TypeScript, `bundler` resolution. Configure a Vite dev proxy from `/api` to the server. Import the shared placeholder to prove cross-package imports. Vitest uses `jsdom` + Testing Library.
- **Acceptance criteria:** `pnpm --filter @claude-assistant/web dev` serves the app; the app renders a heading; `/api` proxy is configured.
- **Test requirements:** Vitest + Testing Library test rendering `App` and asserting visible text.
- **Done definition:** Render test green; dev server serves the page.

## P0-T5 — Linting, formatting, and typecheck

- **Goal:** Enforce consistent style and types across the monorepo.
- **Depends on:** P0-T2, P0-T3, P0-T4.
- **Files:** `eslint.config.js` (flat config), `.prettierrc`, `.prettierignore`, per-package lint wiring as needed.
- **Implementation notes:** ESLint flat config with TypeScript + React rules; Prettier authoritative for formatting. Add `lint` and `typecheck` behavior. Fix any violations introduced by earlier tasks.
- **Acceptance criteria:** `pnpm lint` and `pnpm typecheck` pass across all workspaces.
- **Test requirements:** N/A (tooling). Verify by running both commands clean.
- **Done definition:** Both commands green; committed.

## P0-T6 — Root scripts and dev orchestration

- **Goal:** Provide the canonical root commands documented in `AGENTS.md`.
- **Depends on:** P0-T3, P0-T4, P0-T5.
- **Files:** root `package.json` scripts; optional `turbo`/`npm-run-all`-style config if used.
- **Implementation notes:** Implement `dev` (server + web together), `test` (recursive Vitest), `lint`, `typecheck`, `build`. Keep names exactly as in `AGENTS.md`. `db:generate`/`db:migrate` are added in Phase 1 but may be stubbed here.
- **Acceptance criteria:** Each root script runs the intended workspaces; `pnpm dev` brings up both apps.
- **Test requirements:** N/A. Verify each script manually.
- **Done definition:** All scripts work; `AGENTS.md` table matches reality.

## P0-T7 — CI workflow

- **Goal:** Run install, lint, typecheck, test, and build on every push/PR.
- **Depends on:** P0-T6.
- **Files:** `.github/workflows/ci.yml`.
- **Implementation notes:** Ubuntu runner, Node 22, pnpm with cache; steps: `install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build`. No external services required.
- **Acceptance criteria:** Workflow is valid and green on a clean branch.
- **Test requirements:** N/A. Verify the workflow passes in CI.
- **Done definition:** CI green on the branch.

## P0-T8 — Confirm and reconcile AI-dev docs

- **Goal:** Ensure `AGENTS.md`/`CLAUDE.md` command tables exactly match the implemented scripts and layout.
- **Depends on:** P0-T6.
- **Files:** `AGENTS.md`, `CLAUDE.md` (edits only if reality diverged).
- **Implementation notes:** Reconcile any drift between docs and actual scripts/paths introduced during Phase 0. Do not invent new conventions.
- **Acceptance criteria:** Every command in `AGENTS.md` runs as documented; the layout section matches the repo.
- **Test requirements:** N/A. Spot-run each documented command.
- **Done definition:** Docs verified accurate; committed.
