# Phase 9 — Polish, docs, and e2e

**Theme:** Make the app pleasant and trustworthy: empty/error/loading states, accessibility, a happy-path end-to-end test, and finalized docs.

**Depends on:** Phase 8

**Exit criteria:** Every page has proper loading/empty/error states; light/dark are polished; an automated happy-path e2e passes; docs reflect the shipped app.

---

## P9-T1 — Empty, loading, and error states

- **Goal:** Consistent UX for the not-happy paths across all pages.
- **Depends on:** —
- **Files:** `apps/web/src/components/common/*` (e.g. `EmptyState`, `ErrorState`, `Loading`), page updates, tests.
- **Implementation notes:** Add reusable components and apply them to Workspaces, Profiles, Sessions, Session Run/Detail, Analysis, and Settings. Ensure backend errors render as friendly messages via the typed client.
- **Acceptance criteria:** Each listed page shows appropriate empty/loading/error UI; no unhandled promise rejections or raw error dumps.
- **Test requirements:** Vitest + Testing Library tests for empty and error rendering on at least the Sessions and Analysis pages.
- **Done definition:** Tests green; manual pass across pages.

## P9-T2 — Theme and accessibility polish

- **Goal:** Refine light/dark visuals and baseline accessibility.
- **Depends on:** P9-T1.
- **Files:** theme tweaks under `apps/web/src/theme/*`, component adjustments.
- **Implementation notes:** Check contrast in both schemes, keyboard navigation, focus states, labels/aria on interactive controls, and consistent spacing. Use `theme.applyStyles` for scheme-specific tweaks. Optionally apply MUI v9 `enhanceHighContrast`.
- **Acceptance criteria:** Both schemes pass a basic contrast/keyboard review; interactive controls are labeled and focusable.
- **Test requirements:** Vitest + Testing Library checks for key aria labels/roles on primary actions; manual keyboard walkthrough.
- **Done definition:** Tests green; manual a11y walkthrough done.

## P9-T3 — Happy-path end-to-end test

- **Goal:** One automated e2e proving the primary flow with external services faked.
- **Depends on:** P9-T1.
- **Files:** `e2e/` (Playwright or equivalent), config, CI wiring.
- **Implementation notes:** Boot the server with a fake SDK client and a fake git/gh executor, plus a temp SQLite DB, and run the web app. Script: add workspace → create profile → run session (streamed, produces a fake PR URL) → open sessions list → analyze the session → review staged improvements → apply one and discard another. No real network/GitHub/Anthropic calls.
- **Acceptance criteria:** The e2e runs headless in CI against faked externals and asserts the key outcomes at each step.
- **Test requirements:** The e2e itself; it must be deterministic and network-free.
- **Done definition:** e2e green locally and in CI.

## P9-T4 — Documentation finalization

- **Goal:** Bring docs in line with the shipped implementation.
- **Depends on:** P9-T3.
- **Files:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/*` as needed.
- **Implementation notes:** Update the quickstart to real, working commands and prerequisites; correct any drift in architecture/decisions; add a short "how the improvement loop works" section if helpful. Keep it accurate — no aspirational claims.
- **Acceptance criteria:** Documented commands work as written; architecture/decisions match the code; no stale "planned" language for shipped features.
- **Test requirements:** N/A. Verify by running documented commands from a clean checkout.
- **Done definition:** Docs verified accurate; committed.
