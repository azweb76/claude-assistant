# Phase 5 — Frontend foundation (MUI v9)

**Theme:** Build the web app shell: MUI v9 theme with light/dark, routing, layout, a typed API client, an SSE hook that hydrates and reconnects, and the Settings page.

**Depends on:** Phase 2 (settings endpoints + SSE contract). Can proceed in parallel with Phases 3–4.

**Exit criteria:** The app renders an app shell with navigation, supports a working light/dark toggle, has a typed API client and reusable SSE hook (hydrate + `afterSeq` reconnect + pending-input replay), and the Settings page reads/writes settings against the backend.

Reference: ADR-0007 in [`../decisions.md`](../decisions.md#adr-0007--frontend-vite--react--mui-v9-with-css-theme-variables) and ADR-0011.

---

## P5-T1 — MUI v9 theme with light/dark

- **Goal:** A theme using CSS variables and both color schemes, with a manual toggle.
- **Depends on:** —
- **Files:** `apps/web/src/theme/theme.ts`, `apps/web/src/theme/ThemeModeProvider.tsx`, `apps/web/src/main.tsx` (wire provider), tests.
- **Implementation notes:** `createTheme({ cssVariables: true, colorSchemes: { light: true, dark: true } })`. Provide a mode toggle (light/dark/system) persisted to `localStorage`; use MUI's color-scheme mechanism (e.g. `useColorScheme`) rather than `palette.mode` switching. Use `theme.applyStyles('dark', ...)` for any scheme-specific custom styles.
- **Acceptance criteria:** App renders under both schemes; toggle switches without flicker and persists across reloads; no `palette.mode`-based conditional styling.
- **Test requirements:** Vitest + Testing Library test toggling mode and asserting the persisted value / applied color scheme attribute.
- **Done definition:** Tests green; manual light/dark verified.

## P5-T2 — App layout and routing

- **Goal:** The persistent shell (nav to Workspaces, Profiles, Sessions, Analysis, Settings) and client routing.
- **Depends on:** P5-T1.
- **Files:** `apps/web/src/App.tsx`, `apps/web/src/routes/*` (page stubs), `apps/web/src/components/AppLayout.tsx`, router setup, tests.
- **Implementation notes:** Use a client router (e.g. React Router). Responsive MUI layout (app bar + nav drawer) with the theme toggle in the app bar. Pages are stubs to be filled in later phases.
- **Acceptance criteria:** Navigating between routes renders the right page; layout is responsive; toggle is present in the shell.
- **Test requirements:** Vitest + Testing Library test navigating to at least two routes and asserting rendered content.
- **Done definition:** Tests green.

## P5-T3 — Typed API client

- **Goal:** A typed fetch client sharing schemas/types with the backend.
- **Depends on:** —
- **Files:** `apps/web/src/api/client.ts`, `apps/web/src/api/endpoints.ts`, tests.
- **Implementation notes:** Thin wrapper over `fetch` that parses responses with shared zod schemas from `@claude-assistant/shared` and throws typed errors mapped from the backend error shape. Base URL uses the Vite `/api` proxy. Consider TanStack Query for caching (optional; if used, wire the provider here). Include session user-input, interrupt, and controls helpers (may 404 until Phase 4 exists; types live in shared).
- **Acceptance criteria:** Client returns typed data on success and throws typed errors on the backend error shape; responses validated against shared schemas.
- **Test requirements:** Vitest tests with a mocked fetch: success parse, error mapping, schema-validation failure.
- **Done definition:** Tests green.

## P5-T4 — SSE/event-stream hook (hydrate + reconnect)

- **Goal:** A reusable hook to consume backend SSE streams **after** REST hydration, including browser restart.
- **Depends on:** P5-T3; Phase 2 P2-T3.
- **Files:** `apps/web/src/api/useEventStream.ts`, tests.
- **Implementation notes:** Accept `{ url, lastSeq, onEvent }`. Open `EventSource` with `afterSeq` / `Last-Event-ID`. Parse typed events (`message`/`usage`/`status`/`error`/`user_input_request`/`user_input_resolved`/`control`) with shared schemas. Ignore duplicate `seq`. Merge pending `user_input_request`s (keyed by `requestId`). Reconnect on drop without resetting accumulated durable messages. Tear down on unmount.
- **Acceptance criteria:** Hook accumulates ordered events, dedupes seq, restores pendings on replay, exposes terminal status, cleans up on unmount, reconnects from last seq.
- **Test requirements:** Vitest with mocked `EventSource`: scripted sequence; duplicate seq ignored; pending replay merged; reconnect continues from lastSeq; cleanup.
- **Done definition:** Tests green.

## P5-T5 — Settings page

- **Goal:** View and edit app settings from the UI.
- **Depends on:** P5-T2, P5-T3; Phase 2 P2-T4.
- **Files:** `apps/web/src/routes/SettingsPage.tsx`, tests.
- **Implementation notes:** Form for managed clone dir, default profile, default `settingSources`, analysis model/effort, and the `allowBypassPermissions` guard. Load via the API client; save with validation and success/error feedback.
- **Acceptance criteria:** Settings load and display; edits persist and reload correctly; validation errors shown; save feedback present.
- **Test requirements:** Vitest + Testing Library test with a mocked client: load, edit, save, and error rendering.
- **Done definition:** Tests green; manual verification in the running app.
