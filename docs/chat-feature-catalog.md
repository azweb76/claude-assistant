# Chat feature catalog (binding)

This catalog is **binding**. The reusable session chat component and the agent runner must support **every row**. A feature is not optional because it is rare, off by default in the SDK, or “not the happy path.” If the Claude Agent SDK can emit it or wait on it, the app must persist it, stream it, survive a browser restart, and render or complete the interaction.

Source of truth for types: `@anthropic-ai/claude-agent-sdk` (`SDKMessage`, `ToolInputSchemas`, `Query`, `CanUseTool`) as documented at [Agent SDK TypeScript reference](https://code.claude.com/docs/en/agent-sdk/typescript). When the SDK adds a new message, tool, or control method, add a row here in the same change that consumes the new SDK version.

Related: [product-spec.md](product-spec.md) §4.3, [architecture.md](architecture.md) §4–5 and §11, [ADR-0011](decisions.md#adr-0011--interactive-session-chat-over-sse).

## 1. Session transport and durability

| Id | Capability | Required behavior |
| --- | --- | --- |
| T1 | Streaming-input `query()` | Session chat uses streaming input (async iterable / `streamInput`), not a fire-and-forget single prompt. Follow-ups, interrupt, permission-mode changes, and mid-turn steering require this mode. |
| T2 | Persist every SDK message | Append-only `session_messages` stores the raw `SDKMessage` (type, subtype, payload, seq). No dropping of “noisy” types. |
| T3 | Live SSE | Every persisted message and every pending-input change is pushed as a typed SSE event. |
| T4 | Browser restart | Reload hydrates from `GET /api/sessions/:id` (full transcript + pending inputs + live session controls snapshot), then reconnects SSE from last `seq` (`Last-Event-ID` or `?afterSeq=`). Duplicate seqs are ignored. Pending prompts re-appear until resolved. |
| T5 | SSE gap on a live run | Re-subscribe does not lose events. If the SDK process is still running, pending `canUseTool` / elicitation waiters remain; the server re-emits current pendings on subscribe. Call SDK `reinitialize()` after a transport gap when the SDK client reconnects. |
| T6 | Idempotent replies | User answers are keyed by `requestId`. Double-submit after reload is a no-op if already resolved. |
| T7 | Resume / continue / fork | Capture `session_id` from init/result. Follow-up and post-reload continue use `resume`. Fork is available from the UI when starting a branch of an existing transcript. |
| T8 | Cancel / close | Cancel aborts the query, rejects outstanding waiters, marks pendings `canceled`, keeps the transcript. |

## 2. Composer and Query controls

The chat chrome must expose every `Query` method that a human uses in Claude Code, mapped to REST so a restarted browser can invoke them against the live run.

| Id | UI / API | SDK |
| --- | --- | --- |
| C1 | Text composer (send user turns while idle **and** while running, as a new user message on the input stream) | `streamInput` / user messages with `origin: { kind: "human" }` |
| C2 | File and image attachments on a user turn | User message content blocks (`image`, `document` / file); persist and re-render after reload |
| C3 | Slash commands palette | `supportedCommands()` + `SDKCommandsChangedMessage`; send the command as the user turn |
| C4 | Interrupt | `interrupt()` |
| C5 | Change permission mode mid-session | `setPermissionMode()` |
| C6 | Change model mid-session | `setModel()` |
| C7 | Apply flag settings (effort, ultracode, permissions, hooks, skill overrides, fast mode, agent) | `applyFlagSettings()` |
| C8 | File checkpoint rewind | `enableFileCheckpointing: true`; `rewindFiles(userMessageId)` with dry-run preview |
| C9 | Stop a background task | `stopTask(taskId)` |
| C10 | MCP: status, reconnect, toggle, replace set | `mcpServerStatus`, `reconnectMcpServer`, `toggleMcpServer`, `setMcpServers` |
| C11 | Context usage / cost meter | `getContextUsage()` plus result-message usage and `SDKThinkingTokensMessage` |
| C12 | Account / auth status | `accountInfo()` and `SDKAuthStatusMessage` |
| C13 | Models and agents pickers | `supportedModels()`, `supportedAgents()` |
| C14 | Close query | `close()` via cancel/end session |

## 3. `SDKMessage` types (render all)

Every member of `SDKMessage` has a dedicated renderer (or a shared system-banner renderer with the correct subtype). Unknown future types fall back to a typed JSON inspector **and** a catalog gap test failure until a renderer is added.

| Id | Type / subtype | Chat treatment |
| --- | --- | --- |
| M1 | `SDKAssistantMessage` | Markdown text; thinking / redacted thinking; tool_use; citations; images; aborted/error badges |
| M2 | `SDKUserMessage` / `SDKUserMessageReplay` | Human vs synthetic origin (`SDKMessageOrigin`: human, channel, peer, task-notification, coordinator, auto-continuation) |
| M3 | `SDKResultMessage` | Terminal result, cost, usage, `session_id`; distinguish `origin.kind === "task-notification"` |
| M4 | `SDKSystemMessage` init | Session init: model, tools, slash commands, MCP, capabilities |
| M5 | `SDKPartialAssistantMessage` | Token streaming (`includePartialMessages: true`); replace with the completed assistant message when it arrives |
| M6 | `SDKCompactBoundaryMessage` | Compaction notice (manual vs auto, pre_tokens) |
| M7 | `SDKStatusMessage` | Status line |
| M8 | `SDKLocalCommandOutputMessage` | Local / slash command output |
| M9 | `SDKHookStartedMessage` / `Progress` / `Response` | Hook activity |
| M10 | `SDKPluginInstallMessage` | Plugin install progress |
| M11 | `SDKToolProgressMessage` | In-tool progress |
| M12 | `SDKAuthStatusMessage` | Auth state |
| M13 | `SDKTaskNotificationMessage` / `Started` / `Progress` / `Updated` | Task list live updates |
| M14 | `SDKBackgroundTasksChangedMessage` | Background task tray |
| M15 | `SDKThinkingTokensMessage` | Thinking token meter |
| M16 | `SDKSessionStateChangedMessage` | Session state (plan mode, worktree, cwd, …) |
| M17 | `SDKWorkerShuttingDownMessage` | Live-only banner; ignore on historical replay |
| M18 | `SDKCommandsChangedMessage` | Refresh slash-command palette |
| M19 | `SDKNotificationMessage` | Notification toasts / inline notices |
| M20 | `SDKFilesPersistedEvent` | Files-persisted notice |
| M21 | `SDKToolUseSummaryMessage` | Tool-use summary |
| M22 | `SDKMemoryRecallMessage` | Memory recall card |
| M23 | `SDKRateLimitEvent` | Rate-limit / retry UI |
| M24 | `SDKElicitationCompleteMessage` | MCP elicitation finished |
| M25 | `SDKPermissionDeniedMessage` | Auto-deny as it happens (not only the later tool_result) |
| M26 | `SDKPromptSuggestionMessage` | Clickable prompt chips |
| M27 | `SDKAPIRetryMessage` | Retry/backoff banner |
| M28 | `SDKMirrorErrorMessage` | Mirror/session-store errors |
| M29 | `SDKInformationalMessage` | Banner by `level` (info/notice/suggestion/warning) |
| M30 | `SDKConversationResetMessage` | Conversation reset |

Partial stream events are **not** required to be stored forever; persist the completed message. All other types persist.

## 4. Assistant content blocks

| Id | Block | Treatment |
| --- | --- | --- |
| B1 | `text` | Markdown, code fences, links |
| B2 | `thinking` / `redacted_thinking` | Collapsible thinking; respect hide/show |
| B3 | `tool_use` | Tool-specific card (section 5) |
| B4 | `tool_result` | Tool-specific result; images/PDFs from Read; errors |
| B5 | `image` | Inline image |
| B6 | `document` / files | Download/preview |
| B7 | Citations / search results | Footnotes / source chips |
| B8 | Nested subagent | `parent_tool_use_id` + `forwardSubagentText: true`; nested transcript thread |

## 5. Built-in tools (card + result for every schema)

Render **input and output** for every `ToolInputSchemas` member. Tools that are off by default in SDK sessions still need cards: when the SDK emits them, show them; when a profile enables them, they must work.

| Id | Tool | Extra UI beyond generic JSON |
| --- | --- | --- |
| K1 | `Agent` (alias `Task`) | Nested subagent transcript, background vs sync, isolation/worktree |
| K2 | `AskUserQuestion` | Full interactive card (section 6) |
| K3 | `Bash` | Command, description, timeout, background, sandbox flag; stdout/stderr |
| K4 | `Monitor` | Command or WebSocket watch; event stream |
| K5 | `TaskOutput` | Deprecated but render if present |
| K6 | `Edit` / `Write` / `Read` | Diff / path / image-PDF preview for Read |
| K7 | `Glob` / `Grep` | Match lists |
| K8 | `TaskStop` | Confirm + `stopTask` control |
| K9 | `NotebookEdit` | Cell-level edit summary |
| K10 | `WebFetch` / `WebSearch` | URL/query + results |
| K11 | `Workflow` | Phase/progress of orchestrated subagents; resume-from-run |
| K12 | `TodoWrite` | Todo list (legacy; still render) |
| K13 | `TaskCreate` / `Get` / `Update` / `List` | Live task board in the chat chrome |
| K14 | `EnterPlanMode` / `ExitPlanMode` | Plan-mode chrome; ExitPlanMode is a **blocking** confirm (section 6) |
| K15 | `ListMcpResources` / `ReadMcpResource` / `ReadMcpResourceDir` / `RefreshMcpTools` | Resource browser |
| K16 | `EnterWorktree` / `ExitWorktree` | Worktree badge + keep/remove |
| K17 | `CronCreate` / `Delete` / `List` | Scheduled jobs list |
| K18 | `ScheduleWakeup` | Loop/wakeup status |
| K19 | `RemoteTrigger` | Routines UI when the tool appears |
| K20 | `PushNotification` | Show the proactive message in-app (this is the notification surface) |
| K21 | `REPL` | Code + result |
| K22 | `ReportFindings` | Findings list (file/line/summary/verdict) |
| K23 | `Artifact` | Publish/list links |
| K24 | `Projects` | claude.ai project docs when present |
| K25 | `ShowOnboardingRolePicker` | **Blocking** role picker (section 6) |
| K26 | `Mcp` / MCP server tools | Generic MCP tool card + elicitation (section 6) |
| K27 | `Skill` | Skill invocation card |
| K28 | Unknown / future tool | Structured inspector; catalog gap until named |

If a profile uses a restricted `tools` / `allowedTools` list, **always include** `AskUserQuestion`, `Skill` (when skills are enabled), and `Agent` (when subagents are enabled).

## 6. Blocking user input (survive reload; multiple concurrent)

`canUseTool` (and MCP elicitation) **pauses the SDK** until the app replies. Persist a `pending_user_inputs` row and emit SSE. The chat must show **all** outstanding prompts, not only the latest.

| Id | Kind | Behavior |
| --- | --- | --- |
| P1 | Tool permission | Allow / deny (message) / allow-and-remember (`updatedPermissions` from `suggestions`). Show tool name, input, `blockedPath`, `decisionReason`, subagent `agentID`. |
| P2 | `AskUserQuestion` (one call, many questions) | Render **every** `questions[]` item before submit. Single-select, multi-select, option `preview` (markdown/html via `toolConfig.askUserQuestion.previewFormat`). Per-question freeform “Other”. Answers map keyed by **question text**. Do **not** set top-level `response` when structured `answers` exist (SDK drops the map). |
| P3 | Sequential AskUserQuestion rounds | After one round resolves, a later call is a new pending row. History of answered rounds stays in the transcript. |
| P4 | Concurrent requestIds | Subagents can prompt in parallel. Queue/stack all `requestId`s. |
| P5 | MCP elicitation | Schema form; accept / decline / cancel; `SDKElicitationCompleteMessage`. |
| P6 | `ExitPlanMode` | User accepts the plan (continue implementing) or rejects / stays in plan. |
| P7 | `ShowOnboardingRolePicker` | Role chips; blocks until answered. |
| P8 | `dontAsk` / auto-deny | No prompt; still render `SDKPermissionDeniedMessage`. |
| P9 | Modes | `default`, `acceptEdits`, `bypassPermissions` (gated), `plan`, `dontAsk`, `auto`. `AskUserQuestion` and `requiresUserInteraction` MCP tools still prompt except in `dontAsk`. |

`canUseTool` in the fake SDK **must await** the user’s reply. Tests fail if the stream continues with empty AskUserQuestion answers.

## 7. Claude Code filesystem features (already in the product, must show in chat)

These are not “profile-only.” The chat must surface their effects.

| Id | Feature | Chat / runner requirement |
| --- | --- | --- |
| F1 | CLAUDE.md + rules | Visible in init/system; agent follows them (`settingSources` includes `user` + `project`) |
| F2 | Skills | Skill tool cards; `/skill` via slash commands |
| F3 | Subagents | Nested threads (`forwardSubagentText`) |
| F4 | Hooks | Hook messages; filesystem hooks from settings still run |
| F5 | MCP servers + connectors | Status in chrome; tools; elicitation |
| F6 | Plugins | `SDKPluginInstallMessage` |
| F7 | Auto memory | `SDKMemoryRecallMessage`; writes via Read/Write |
| F8 | Output styles / system prompt | Honored via profile + init |
| F9 | Thinking / effort / ultracode | Thinking blocks + `applyFlagSettings` |
| F10 | Sandbox / `dangerouslyDisableSandbox` | Permission card, never silent |

## 8. Test contract

- Shared fixtures under `packages/shared` (or `apps/web` + `apps/server` test fixtures) cover **every catalog id** at least once.
- Server: fake `query()` yields each `SDKMessage` type; permission/question/elicitation waiters block.
- Web: each renderer has a Testing Library test; reconnect test remounts with persisted transcript + at least one pending P2 and one pending P1.
- Adding an SDK type without a fixture fails a catalog completeness test (explicit enum of ids in `packages/shared`).
