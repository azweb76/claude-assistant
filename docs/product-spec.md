# Product Specification

## 1. Vision

**claude-assistant** is a local-first tool that lets a single developer delegate coding work to the Claude Agent SDK across their GitHub repositories, and then continuously improves the quality of that delegation by analyzing past sessions.

The product has two loops:

- **The delivery loop:** configure an agent, point it at a repo, give it a prompt, and get a pull request.
- **The improvement loop:** analyze completed sessions for waste and inefficiency, and stage concrete improvements to instructions and skills so future sessions are cheaper, faster, and better.

## 2. Users and assumptions

- Exactly one user, running the app on their own machine.
- The user has a working Claude Code login and a working `gh`/`git` login.
- The user is technically proficient and comfortable reviewing diffs, PRs, and agent transcripts.
- No authentication, authorization, or multi-tenancy is required.

## 3. Core concepts (entities)

| Concept | Description |
| --- | --- |
| **Workspace** | A GitHub repository the user wants agents to work in. Cloned locally to a managed directory. Owns default branch info and local clone path. |
| **Agent Profile** | A reusable, named bundle of Claude Agent SDK settings: model, effort, permission mode, authorized (allowed/disallowed) tools, enabled skills/subagents, and limits (`maxTurns`, `maxBudgetUsd`). Managed independently and reused across sessions. |
| **Session** | One agent run: a prompt executed against a workspace using an agent profile. Owns status, the streamed transcript, token/cost usage, the created branch, and the resulting PR link. |
| **Session Message** | A single persisted event from the SDK stream (every `SDKMessage` in the [chat catalog](chat-feature-catalog.md)). Append-only; the transcript of a session. |
| **Pending user input** | A blocking SDK prompt (`canUseTool` permission, AskUserQuestion, MCP elicitation, plan-exit, role picker) waiting for the user. Survives browser restart. |
| **Analysis** | The result of analyzing one or more selected sessions for waste/inefficiency. Owns a summary and a set of findings. |
| **Staged Improvement** | A concrete, reviewable proposed edit produced by an analysis, targeting a specific file at a specific scope (user or project), in one of three categories. Has a lifecycle: staged → applied or discarded. |
| **App Settings** | Global configuration: managed clone directory, default agent profile, Claude Code `settingSources` defaults, analysis model/effort, etc. |

## 4. User flows

### 4.1 Add a workspace

```mermaid
flowchart LR
  a[User enters GitHub repo] --> b[App verifies access via gh]
  b --> c[Clone repo to managed dir using local git creds]
  c --> d["Persist workspace: name, remote, default branch, local path"]
  d --> e["Workspace appears in list, ready for sessions"]
```

- Input: repository reference (e.g. `owner/name` or URL).
- The app uses the local `gh`/`git` credentials to verify access and clone.
- Failures (no access, bad ref, clone error) are surfaced clearly and do not create a half-initialized workspace.

### 4.2 Manage agent profiles

- Full CRUD. A profile edits every configurable SDK setting the app supports.
- Fields: `name`, `model`, `effort`, `permissionMode`, `allowedTools`, `disallowedTools`, `skills`, `agents` (subagents), `settingSources`, `maxTurns`, `maxBudgetUsd`, and an optional extra `systemPrompt` append.
- Deleting a profile that is referenced by historical sessions must preserve those sessions' recorded settings (sessions snapshot the profile values used at run time).
- Ships with sensible built-in default profiles (e.g. a conservative "plan-first" profile and a "build + PR" profile).

### 4.3 Create and run a session (interactive chat)

The session UI is a **reusable chat component** that supports the full Claude Agent SDK surface defined in [`chat-feature-catalog.md`](chat-feature-catalog.md). Permissions and `AskUserQuestion` are required, but they are not the whole product: every `SDKMessage`, built-in tool card, Query control, slash command, attachment, MCP elicitation, plan/worktree/task UI, and reload/reconnect path in that catalog is in scope.

```mermaid
flowchart TD
  a[User selects workspace + agent profile] --> b[User writes prompt plus optional attachments]
  b --> c[App snapshots profile settings into the session]
  c --> d[Runner creates/checkout a fresh branch in the clone]
  d --> e["Runner starts streaming-input query mapped from profile"]
  e --> f[Persist every SDK message and SSE to the chat]
  f --> g{Needs user input?}
  g -->|permission / questions / elicitation / plan exit| h[Chat shows all pending prompts]
  h --> i[User answers; canUseTool / elicitation resolves]
  i --> f
  g -->|still running| f
  f --> j{Run outcome}
  j -->|"success + changes"| k["Commit, push, open PR via gh"]
  j -->|"no changes / error / canceled"| l["Record final status, no PR"]
  k --> m[Session shows PR link, cost, token usage]
  l --> m
```

- The prompt and profile are required; the workspace determines `cwd`. Optional attachments (files/images) are part of the first user turn.
- The runner uses **streaming input** so the user can send follow-ups, slash commands, interrupt, change model/permission mode, and attach files without waiting for a terminal result.
- The chat streams live: every catalog message type, tool card, thinking, subagent threads, tasks, usage/cost, and system banners.
- Blocking prompts (`canUseTool` permissions, multi-question `AskUserQuestion`, MCP elicitation, `ExitPlanMode`, role picker) pause the agent until the user replies. **Multiple** prompts can be outstanding; a single `AskUserQuestion` may contain many questions, all of which must be answered together.
- **Browser restart** mid-run restores the transcript and any unresolved prompts from the server, then resumes the SSE stream from the last sequence number. The agent process is assumed still running.
- The user can cancel/interrupt a running session.
- On success with file changes, the runner commits, pushes a branch, and opens a PR using `gh`. The PR URL is stored on the session.
- Sessions are resumable via SDK `session_id` / `resume` / fork. File checkpoint rewind is available when checkpointing is enabled.

### 4.4 Analyze sessions and stage improvements

```mermaid
flowchart TD
  a[Sessions list page] --> b[User selects one or more sessions]
  b --> c[User triggers Analyze]
  c --> d[Analyzer builds a review prompt from selected transcripts + usage]
  d --> e[A Claude review agent identifies waste/inefficiency]
  e --> f["Findings categorized: instructions / project skills+agents / user skills+agents"]
  f --> g["Engine produces staged edits with target file, scope, and diff"]
  g --> h[Review UI shows each staged improvement as a diff]
  h --> i{Per improvement}
  i -->|Apply| j[Write edit to target file at correct scope]
  i -->|Discard| k["Mark discarded, no file change"]
```

- Analysis is **manual** and **explicit**: nothing is analyzed or applied automatically.
- The engine looks for waste and inefficiency signals: redundant tool calls, repeated file reads, thrash/backtracking, oversized context, excessive turns relative to task size, high cost for low output, ignored existing conventions, etc.
- Findings become **staged improvements** in three categories with strict scope routing:
  - **Claude instructions** → `CLAUDE.md` (project scope) or user instructions (user scope) as appropriate.
  - **Project skills/agents** → the workspace repo's `.claude/` — **only** when the improvement is specific to that project.
  - **User skills/agents** → user scope `~/.claude/` — for generic capabilities (e.g. plan, implement, code review) that are not project-specific.
- Each staged improvement is presented as a reviewable diff. The user applies or discards each one individually. Applying writes to the correct file/scope; discarding changes nothing on disk.
- Scope routing is a first-class rule: generic skills must never be written to a project, and project-specific skills must never be written to user scope.

## 5. Configuration surface

All agent behavior is configurable. Nothing about the agent run is hard-coded that a user might reasonably want to change:

- Per agent profile: model, effort, permission mode, allowed/disallowed tools, skills, subagents, setting sources, turn/budget limits, extra system prompt.
- Global app settings: managed clone directory, default profile, default `settingSources`, analysis model/effort, and whether `bypassPermissions` is permitted at all.

## 6. Non-goals (this product)

- No hosting/multi-user/accounts.
- No support for non-Claude model providers (the SDK is Claude-only by design).
- No secret/key management UI — auth is delegated to Claude Code and local `gh`/`git`.
- No automatic (unattended) application of improvements — staging and manual review are mandatory.
- No repository hosting other than GitHub in the first iterations.

## 7. Success criteria for the product

- A user can add a repo, create a profile, run a session in the reusable chat (full catalog: tools, permissions, multi-question AskUserQuestion, MCP, plan mode, slash commands, attachments), survive a browser reload mid-run, and receive a real PR.
- A user can select past sessions, run an analysis, and review categorized, correctly-scoped staged improvements as diffs, then apply or discard each.
- Light and dark themes both look correct and are toggleable.
- All logic is covered by Vitest; UI flows are verified in the running app.
