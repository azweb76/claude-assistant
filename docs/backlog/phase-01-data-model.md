# Phase 1 — Data model (SQLite + Drizzle)

**Theme:** Define the persistent schema and typed data-access layer for every entity, with migrations and unit tests.

**Depends on:** Phase 0

**Exit criteria:** Drizzle schema compiles; `pnpm db:generate` and `pnpm db:migrate` work against a SQLite file; repositories for all entities are implemented and unit-tested against a fresh temp DB.

Reference: data model sketch in [`../architecture.md`](../architecture.md#3-data-model-drizzle-sketch).

---

## P1-T1 — Drizzle setup and SQLite client

- **Goal:** Configure Drizzle + `drizzle-kit` and a SQLite client factory usable in app and tests.
- **Depends on:** —
- **Files:** `apps/server/src/db/client.ts`, `apps/server/drizzle.config.ts`, `apps/server/package.json` (deps + `db:generate`/`db:migrate` scripts), root `package.json` (wire `db:*`).
- **Implementation notes:** Use `better-sqlite3` (or libsql) with Drizzle. `client.ts` exports a factory that accepts a DB path (default = app data dir; tests pass a temp path or `:memory:`). Enable foreign keys and WAL where appropriate.
- **Acceptance criteria:** A DB client can be created against a temp path; `drizzle.config.ts` points at the schema and migrations dir.
- **Test requirements:** Vitest test that creates an in-memory client and runs a trivial query.
- **Done definition:** Client factory tested; config valid.

## P1-T2 — Workspace schema + repository

- **Goal:** Persist workspaces and provide typed CRUD.
- **Depends on:** P1-T1.
- **Files:** `apps/server/src/db/schema/workspaces.ts`, `apps/server/src/db/repositories/workspaces.ts`, `packages/shared/src/schemas/workspace.ts`, tests under `apps/server/src/db/repositories/__tests__/`.
- **Implementation notes:** Columns per architecture sketch (`id`, `name`, `remote`, `owner`, `repo`, `defaultBranch`, `localPath`, timestamps). Shared zod schema is the validation source; repository returns typed rows. Ids are UUIDs.
- **Acceptance criteria:** Create/get/list/delete work; unique constraint prevents duplicate remotes; invalid input rejected by the zod schema.
- **Test requirements:** Vitest CRUD tests including the uniqueness constraint and validation failure.
- **Done definition:** Tests green; schema migrated.

## P1-T3 — Agent profile schema + repository

- **Goal:** Persist agent profiles with all configurable SDK settings and provide CRUD.
- **Depends on:** P1-T1.
- **Files:** `apps/server/src/db/schema/agentProfiles.ts`, `apps/server/src/db/repositories/agentProfiles.ts`, `packages/shared/src/schemas/agentProfile.ts`, tests.
- **Implementation notes:** Fields per [product-spec §4.2](../product-spec.md#42-manage-agent-profiles) and the profile→Options mapping. JSON columns for arrays/objects (`allowedTools`, `disallowedTools`, `skills`, `agents`, `settingSources`). `effort` and `permissionMode` are enums validated in the shared schema. Include `isBuiltIn` flag.
- **Acceptance criteria:** CRUD works; enum values validated; JSON fields round-trip; built-in profiles are marked and (optionally) protected from deletion.
- **Test requirements:** Vitest CRUD + validation tests (invalid enum, malformed JSON field rejected pre-persist).
- **Done definition:** Tests green; schema migrated.

## P1-T4 — Session + session_messages schema + repositories

- **Goal:** Persist sessions and their append-only transcripts.
- **Depends on:** P1-T2, P1-T3.
- **Files:** `apps/server/src/db/schema/sessions.ts`, `apps/server/src/db/schema/sessionMessages.ts`, `apps/server/src/db/repositories/sessions.ts`, `apps/server/src/db/repositories/sessionMessages.ts`, `packages/shared/src/schemas/session.ts`, tests.
- **Implementation notes:** `sessions` includes `profileSnapshot` (frozen JSON), `status` enum (`pending|running|succeeded|failed|canceled`), `sdkSessionId`, `branchName`, `prUrl`, usage columns, timestamps, FKs to workspace and profile. `session_messages` is append-only with a monotonic `seq` per session and `type`/`subtype`/`payload`. Provide an `appendMessage` that assigns the next `seq` and a `listMessages` ordered by `seq`.
- **Acceptance criteria:** Sessions CRUD + status transitions persist; messages append in order; listing returns ordered transcript; FKs enforced.
- **Test requirements:** Vitest tests for session lifecycle fields, ordered message append/list, and FK enforcement.
- **Done definition:** Tests green; schema migrated.

## P1-T5 — Analysis + staged_improvements schema + repositories

- **Goal:** Persist analyses and their staged improvements with lifecycle.
- **Depends on:** P1-T4.
- **Files:** `apps/server/src/db/schema/analyses.ts`, `apps/server/src/db/schema/stagedImprovements.ts`, `apps/server/src/db/repositories/analyses.ts`, `apps/server/src/db/repositories/stagedImprovements.ts`, `packages/shared/src/schemas/analysis.ts`, tests.
- **Implementation notes:** `analyses` stores `sessionIds` (JSON), `status`, `summary`, model/effort, timestamps. `staged_improvements` stores `category` (`claude_instructions|project_skill_agent|user_skill_agent`), `scope` (`user|project`), optional `workspaceId`, `targetPath`, `rationale`, `currentContent`, `proposedContent`, `diff`, and `status` (`staged|applied|discarded`). Enforce: `scope = project` requires `workspaceId`.
- **Acceptance criteria:** CRUD works; category/scope/status enums validated; the `scope=project ⇒ workspaceId` invariant is enforced; status transitions persist.
- **Test requirements:** Vitest tests for enums, the scope/workspace invariant, and status transitions (`staged→applied`, `staged→discarded`).
- **Done definition:** Tests green; schema migrated.

## P1-T6 — App settings store

- **Goal:** A simple keyed settings store for global configuration.
- **Depends on:** P1-T1.
- **Files:** `apps/server/src/db/schema/appSettings.ts`, `apps/server/src/db/repositories/appSettings.ts`, `packages/shared/src/schemas/appSettings.ts`, tests.
- **Implementation notes:** Key/JSON-value rows with typed getters/setters for known keys: managed clone dir, default profile id, default `settingSources`, analysis model/effort, and `allowBypassPermissions`. Provide typed defaults when a key is unset.
- **Acceptance criteria:** Get/set round-trips typed values; unknown keys handled safely; defaults returned when unset.
- **Test requirements:** Vitest tests for get/set/defaults for each known key.
- **Done definition:** Tests green; schema migrated.

## P1-T7 — Migrations, seed, and idempotent bootstrap

- **Goal:** Generate initial migrations and seed built-in agent profiles + default settings.
- **Depends on:** P1-T2, P1-T3, P1-T5, P1-T6.
- **Files:** `apps/server/drizzle/**` (generated), `apps/server/src/db/seed.ts`, `apps/server/src/db/migrate.ts`, tests.
- **Implementation notes:** `pnpm db:generate` produces migrations; `pnpm db:migrate` applies them. Seed a conservative "Plan-first" profile and a "Build + PR" profile, plus default settings. Seeding must be idempotent (safe to run repeatedly).
- **Acceptance criteria:** A fresh DB migrates cleanly; seeding twice does not duplicate rows; built-in profiles and defaults present after bootstrap.
- **Test requirements:** Vitest test: migrate a fresh temp DB, seed twice, assert exactly the expected built-ins/settings exist.
- **Done definition:** Tests green; migrations committed.
