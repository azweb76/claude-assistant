# Phase 2 — Backend core & API

**Theme:** Turn the Fastify skeleton into a real API: DB wiring, error handling, validation, SSE plumbing, and the settings endpoints.

**Depends on:** Phase 0, Phase 1

**Exit criteria:** The server exposes validated REST endpoints for settings and health, a reusable SSE mechanism, consistent typed error responses, and `buildApp()` supports injecting a test DB and mocked services.

Reference: API surface in [`../architecture.md`](../architecture.md#4-api-surface-rest--sse).

---

## P2-T1 — App composition and dependency injection

- **Goal:** `buildApp()` composes routes and services with injectable dependencies (DB, SDK runner, git executor, clock).
- **Depends on:** —
- **Files:** `apps/server/src/app.ts`, `apps/server/src/lib/deps.ts`, tests.
- **Implementation notes:** Define a `Dependencies` type carrying the DB client and service factories. `buildApp(deps)` wires them onto Fastify (decorators or a request context). Production `index.ts` builds real deps; tests pass fakes/mocks and a temp DB.
- **Acceptance criteria:** `buildApp` accepts injected deps; routes resolve services from the container; no module-level singletons for DB/SDK/git.
- **Test requirements:** Vitest test constructing `buildApp` with a temp DB and asserting a decorated dependency is reachable in a route.
- **Done definition:** Tests green; DI in place.

## P2-T2 — Error handling and validation middleware

- **Goal:** Consistent, typed error responses and request validation from shared zod schemas.
- **Depends on:** P2-T1.
- **Files:** `apps/server/src/lib/errors.ts`, `apps/server/src/lib/validation.ts`, Fastify error handler wiring, tests.
- **Implementation notes:** Define typed error classes (e.g. `NotFoundError`, `ValidationError`, `ConflictError`, `ExternalCommandError`) mapped to HTTP status + a stable JSON error shape `{ error: { code, message, details? } }`. Validate params/body/query via shared zod schemas; never leak stack traces.
- **Acceptance criteria:** Unknown routes return structured 404; validation failures return 400 with details; thrown typed errors map to the right status.
- **Test requirements:** Vitest tests for 404, a validation 400, and a mapped domain error.
- **Done definition:** Tests green.

## P2-T3 — SSE utility and streaming contract

- **Goal:** A reusable SSE helper for streaming session/analysis progress.
- **Depends on:** P2-T1.
- **Files:** `apps/server/src/lib/sse.ts`, `packages/shared/src/schemas/streamEvents.ts`, tests.
- **Implementation notes:** Helper sets SSE headers, serializes `event`/`data`, sends periodic heartbeats, and cleans up on client disconnect. Define shared event types (`message`, `usage`, `status`, `error`, `user_input_request`, `user_input_resolved`, `control`) and their payload schemas in `packages/shared`. Set SSE `id` to the transcript `seq` so clients can resume with `Last-Event-ID` / `afterSeq`. Provide a way to bridge an async iterable/emitter to the SSE response. On a new subscriber, the session stream (Phase 4) re-emits all still-pending `user_input_request`s.
- **Acceptance criteria:** A test route streams a sequence of typed events that a client reads in order and terminates cleanly; disconnect stops the stream; event ids are present for resume.
- **Test requirements:** Vitest test driving an SSE route via inject/stream and asserting event order, event ids, and termination.
- **Done definition:** Tests green; event schemas exported from shared.

## P2-T4 — Settings endpoints

- **Goal:** Read and update app settings over HTTP.
- **Depends on:** P2-T1, P2-T2; Phase 1 P1-T6.
- **Files:** `apps/server/src/routes/settings.ts`, tests.
- **Implementation notes:** `GET /api/settings` returns effective settings (with defaults); `PUT /api/settings` validates and persists changes. Guard `allowBypassPermissions` explicitly.
- **Acceptance criteria:** GET returns defaults on a fresh DB; PUT persists and is reflected by a subsequent GET; invalid payloads rejected.
- **Test requirements:** Vitest route tests for GET defaults, PUT round-trip, and validation failure.
- **Done definition:** Tests green.

## P2-T5 — Health, logging, and startup

- **Goal:** Production-ready boot with structured logging and graceful shutdown.
- **Depends on:** P2-T1.
- **Files:** `apps/server/src/index.ts`, `apps/server/src/lib/logger.ts`, tests where feasible.
- **Implementation notes:** Structured logger (Fastify's pino) with sane levels; run pending migrations on boot; graceful shutdown closing the DB. `/api/health` reports status and DB connectivity.
- **Acceptance criteria:** Server boots, applies migrations, serves `/api/health` reporting DB OK, and shuts down cleanly.
- **Test requirements:** Vitest test for `/api/health` including DB-connectivity signal.
- **Done definition:** Tests green; manual boot verified.
