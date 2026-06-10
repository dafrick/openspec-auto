## Context

`openspec-auto` is a new repository containing Claude Code skill files and TypeScript tooling that implements an autonomous GitHub issue lifecycle agent. It has no prior codebase; all decisions here are greenfield. The system coordinates with the OpenSpec CLI and skills ecosystem, the `gh` CLI, and the Claude Code harness (worktree tools, Skill invocation, Agent spawning).

The design is informed by two constraints: (1) the Claude Code `/loop` mechanism re-reads the invoking skill on each iteration — so the main skill must be a slash command, not a file path; (2) context compression causes instruction drift across long runs — so expensive phases must run as isolated sub-agents with their own skill files.

## Goals / Non-Goals

**Goals:**
- Autonomous issue lifecycle: triage → explore → propose → implement → review → wrap-up
- Resumable: local state file is source of truth; PR description is the human-visible checkpoint; GitHub PR scan is the crash-recovery fallback
- Structured: every issue gets an OpenSpec proposal, design, and task list before code is written
- Light skill files: prerequisites and environment setup live in README and init, not skills
- Testable: TypeScript helpers have unit tests

**Non-Goals:**
- Skillet packaging — out of scope for now; the skill files will be used directly
- Multi-issue parallelism — one issue per loop iteration
- Cross-repository operation
- Auto-merging PRs — human review is always the final step

## Decisions

### D1: Orchestrator + Sub-Agent Architecture

**Decision**: The main `openspec-auto` skill manages the phase state machine and delegates each expensive phase to a dedicated sub-agent skill (`openspec-auto-triage`, `openspec-auto-explore`, `openspec-auto-implement`, `openspec-auto-review`). Sub-agents are invoked via the `Agent` tool, not the `Skill` tool directly.

**Rationale**: Each sub-agent runs in an isolated context window — no instruction drift, no accumulated context from prior phases. The main loop receives a structured result and advances the state machine. This mirrors how real pipelines work: a coordinator delegates to workers.

**Alternative considered**: Inline all phases into one large skill file. Rejected — context compression across a full implementation run (explore → 50 commits → review) would cause the agent to forget early instructions.

**Alternative considered**: Use the `Skill` tool to invoke sub-agents. Rejected — `Skill` loads instructions into the current context window (same agent), defeating isolation. `Agent` spawns a fresh context.

---

### D2: Sub-Agents Are Prompt Files, Not Skills

**Decision**: Each sub-agent is defined entirely by a prompt file under `skill/openspec-auto/prompts/` (`triage.md`, `explore.md`, `implement.md`, `review.md`). The orchestrator dispatches it with the `Agent` tool, filling `{{PLACEHOLDERS}}` with the context the sub-agent needs. There are no separate sub-agent `SKILL.md` files; `openspec-auto` is the only installed skill.

**Rationale**: The sub-agents are never invoked standalone — only the orchestrator dispatches them — so a separate skill layer added indirection (a prompt that points at a skill) with no benefit. This matches the superpowers `subagent-driven-development` model, where the prompt file *is* the sub-agent definition: one file per sub-agent, nothing to keep in sync.

**Supersedes**: an earlier design (this decision and D7) where each sub-agent was its own co-located `SKILL.md` invoked by name. That layer was removed once it was clear the sub-agents are pure orchestrator-dispatched roles.

---

### D3: Config File — `.openspec-auto.json`, Git-Ignored

**Decision**: A file `.openspec-auto.json` at the repo root carries per-project config (reviewer GitHub handle, etc.). It is git-ignored. A TypeScript `init` script creates it by inferring values from GitHub (`gh repo view`) and presenting them to the user for acceptance or override.

**Rationale**: Config varies per project (different reviewers, future settings). Git-ignoring prevents accidental commits of reviewer handles or future sensitive values. The init script's GitHub-inference default makes setup nearly zero-friction.

**Alternative considered**: Extend `openspec/config.yaml`. Rejected — that file belongs to the OpenSpec schema/CLI contract; mixing loop config there creates coupling.

**Alternative considered**: Environment variables. Rejected — verbose to set, invisible to the agent on re-invocation.

**Skill behavior on missing config**: Phase 0 checks for `.openspec-auto.json`. If absent, the skill stops with: *"Config not found. Run `npx openspec-auto init` to set up."*

---

### D4: State in `state.json`; the PR is the human-visible record

**Decision**: Machine state lives in `.openspec-auto/state.json` at the worktree root — the source of truth, read on every transition without a network call. Fields: `phase`, `issue`, `prNumber`, `branch`, `changeName`, `ciFixes`, `blocked`.

The **PR description** is the human-visible record and the durable checkpoint. It has two regions: the **agent-status block on top** (`## Agent Status` table + `<!-- agent-state: {...} -->` marker, written from `state.json`) and the **latest discovery output below it** (see D5). The description is overwritten as the run progresses, so it always shows where things stand — never an accreting log.

The **PR comments** hold the dialogue: blocking questions the agent raises, and the human's answers. (Contrast: the description is *state*, the comments are *conversation*.)

**Scripts**: `sync-pr-state.ts` updates only the status block in place; `write-discovery.ts` overwrites the body as status-block + discovery. Both edit through `gh pr edit --body-file` (a temp file), so markdown containing quotes, backticks, or `$` can't break shell quoting.

**Rationale**: Decoupling state reads from GitHub keeps rate-limiting and auth-expiry out of the hot path. Keeping the description as a single overwritten summary (rather than appending) means a human opening the PR sees the current picture immediately, and a resuming run can read the prior discovery back without wading through stale versions.

**Crash recovery**: if `state.json` is absent (worktree force-removed, or a new machine), Assess scans open PRs for the `<!-- agent-state: {...} -->` marker and reconstructs `state.json` before resuming.

**Alternative considered**: PR description as sole source of truth. Rejected — every state read would require a GitHub API call.

**Alternative considered**: exploration written to a tracked file (`discovery.md`) committed to the branch. Rejected — the PR description already survives worktree removal and is where a human looks; a committed scratch file would pollute the diff and need cleanup at archive time.

---

### D5: Explore Produces a Discovery Output, Persisted to the PR

**Decision**: The explore sub-agent investigates the issue (generating and answering questions from the codebase by issue type) and returns a synthesized **discovery output** — a structured write-up (Problem, Classification, Findings, Approach, Out of scope), *not* a transcript of questions and *not* a verbatim dump. For bugs it must cover whether existing specs govern the behavior and what the desired behavior is; for features it must assess whether the change is minor (add-on / local refactor) or major (architectural rework). The orchestrator writes this output into the PR description (D4) and, on `EXPLORED`, passes it inline to Propose.

**The orchestrator's contract**: explore returns `**Status:** EXPLORED` (no blocking questions — proceed to Propose) or `**Status:** NEEDS_INPUT` (blocking questions present). The output ends with a `## Blocking Questions` section (a numbered list, or `(none)`). On `NEEDS_INPUT` the orchestrator posts those questions as a PR comment and parks the run.

**Resume**: a parked `NEEDS-INPUT` PR resumes when a human answers (a comment newer than the questions). The orchestrator re-dispatches explore, this time passing the issue *plus* the PR description (prior discovery) and all comments (the dialogue). Explore produces a fresh discovery that overwrites the description, and either clears or asks again. The description holds exactly one discovery at all times; the comment thread holds the back-and-forth.

**Rationale**: A verbatim transcript is noisy and bloats the PR; a synthesized discovery is what Propose actually needs and what a human wants to read. Persisting it to the description (rather than returning it only through the sub-agent boundary) means the requirements work survives a NEEDS-INPUT pause and a context reset — it is the artifact explore would otherwise never write to disk. The minor/major assessment doubles as a late scope gate: "major" is a legitimate blocking question even after triage passed the issue.

---

### D6: Sub-Agent Output Contract — Status Enum + Prose

**Decision**: Every sub-agent output begins with a `**Status:** <CODE>` line. The status code is the machine-readable signal the orchestrator branches on. Natural language prose follows, providing detail the orchestrator can read with LLM understanding when needed (e.g., reading blocking questions from the explore sub-agent to post to the PR).

**Status enums per sub-agent:**

| Sub-agent | Status codes |
|-----------|-------------|
| `triage` | `SELECTED`, `NO_ELIGIBLE`, `NEEDS_CONTEXT` |
| `explore` | `EXPLORED`, `NEEDS_INPUT` |
| `implement` | `DONE`, `BLOCKED`, `CI_BLOCKED` |
| `review` | `APPROVED`, `CHANGES_REQUESTED`, `CI_BLOCKED` |

**Rationale**: Status codes make orchestrator branching reliable without scripted parsing of prose. The pattern is taken directly from the superpowers `subagent-driven-development` skill, which uses `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`. Prose detail is for human observers and for the orchestrator to mine for specifics when needed (e.g., which blocking questions to post).

**Context is passed inline**: The orchestrator constructs each sub-agent's invocation prompt with all needed context (issue body, task list, PR number) pasted inline. Sub-agents do not read files the orchestrator didn't give them. This is the superpowers principle: "you construct exactly what they need."

**Alternative considered**: File-based handoff (sub-agent writes result JSON, orchestrator reads). Rejected — adds file I/O, cleanup contracts, and shared-state complexity. Status enum + prose handled by LLM is simpler and equally reliable for the data volumes involved.

---

### D7: One Prompt File Per Sub-Agent

**Decision**: Each sub-agent has its own prompt file (`prompts/triage.md`, etc.); they are not merged into a single parameterized prompt.

**Rationale**: The four sub-agents have genuinely different shapes. Triage and explore are stateless evaluation tasks. Implement is a stateful execution loop (delegates to `opsx:apply`, watches CI). Review delegates to `superpowers:requesting-code-review` and adds a scope filter. One file with mode branches would be long and mostly-irrelevant per dispatch; four focused files keep each prompt to what that role needs.

**Shared conventions** repeat in each file rather than being abstracted out: the "you have no prior context" framing, the `**Status:**` output contract, and the inline-context principle. (The `<SUBAGENT-STOP>` guard was dropped — it only made sense when these were invokable skills.)

---

### D8: Worktree Management — `ExitWorktree` Tool

**Decision**: Use the Claude Code harness `ExitWorktree` tool with `action: "keep"` for teardown. Document `git worktree remove <path>` as the manual fallback.

**Rationale**: `ExitWorktree` integrates with the harness's worktree tracking and handles edge cases (uncommitted changes, lock files). Prefer harness tools over equivalent bash where available.

---

### D9: State Machine Diagram in Main Skill — Mermaid

**Decision**: The main `openspec-auto` skill includes the phase state machine as a Mermaid diagram. Sub-agent skills include flow diagrams where they aid comprehension.

**Rationale**: Mermaid renders in GitHub PR previews and skill documentation. A visual state machine is the single best way to communicate the resume logic to a model reading the skill file.

---

### D10: `ciFixes` Counter Resets Per Phase

**Decision**: The `ciFixes` field in agent-state tracks CI fix attempts within the current phase only. It resets to 0 when Phase 6 starts.

**Rationale**: A failure in Phase 5 implementation is a different failure mode from a failure in Phase 6 post-review. Cumulative counting would block Phase 6 on issues already resolved. Per-phase counting gives each phase a fair 3-attempt budget.

---

### D11: TypeScript for All Scripts, With Tests

**Decision**: All non-skill tooling (init script, state sync helper) is written in TypeScript. Each script has a corresponding test file. Tests use Node's built-in test runner (`node:test`).

**Rationale**: Testability is the primary driver — especially for the state sync script where a bug silently corrupts PR descriptions. TypeScript also catches type errors at build time. The whole repository will become an npm package, so the Node.js runtime is already a given. The built-in test runner avoids a Jest/Vitest dependency.

---

### D12: Delegate to superpowers/opsx; pick the model per sub-agent

**Decision**: The skills lean on existing skills rather than re-describing their logic. Implement delegates the task loop to `opsx:apply` (which itself runs `superpowers:test-driven-development` per task) and adds only CI monitoring. Review delegates to `superpowers:requesting-code-review` and adds only the in-scope/out-of-scope/unclear scope filter. Wrap-up runs `superpowers:finishing-a-development-branch` before `opsx:archive`. Each sub-agent is dispatched with the cheapest sufficient model: triage `haiku`, explore and implement `sonnet`, review `opus`.

**Rationale**: Re-implementing a task loop or review mechanics duplicates maintained behavior and drifts out of sync. The openspec-auto layer should carry only what is genuinely its own. Model selection follows the superpowers `subagent-driven-development` guidance — match model power to task complexity, with review (design judgment, scope calls) getting the strongest model.

## Risks / Trade-offs

**R1: Harness tool availability** → The `ExitWorktree` tool is only available inside harness-managed sessions. Documented fallback: `git worktree remove <path>`. If the harness is absent, the agent falls back gracefully.

**R2: OpenSpec skills not installed** → The init script checks that `opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive` are available in `~/.claude/skills/`. If any are missing, init warns and links to install instructions.

**R3: `gh` rate limiting** → Fetching 50 issues + comments per iteration could hit GitHub API limits on busy repos. Mitigation: `--limit 50` is already a cap; the skill can be tuned to `--limit 20` for high-volume repos.

**R4: Sub-agent context size** → A large codebase exploration in `openspec-auto-explore` could fill a sub-agent's context window before producing output. Mitigation: the explore skill explicitly scopes investigation to files/modules relevant to the issue, not a full repo crawl.

**R5: PR body size limits** → GitHub PR descriptions cap at ~65,000 chars. The description holds the agent-status block plus exactly one discovery output (overwritten each run, never accreting), so it stays bounded — a pathologically large discovery is the only risk. Mitigation: explore synthesizes rather than dumps, keeping the discovery proportionate to the issue; the dialogue lives in comments, not the body.

**R6: state.json lost on force-remove** → If a worktree is force-removed mid-run (e.g., manual cleanup), `.openspec-auto/state.json` is lost. Phase 0's GitHub PR scan fallback recovers from this, but only if the PR was synced before the loss. Mitigation: sync to PR description at every phase transition (not just periodically).

## Open Questions

- Should `openspec-auto-implement` and `openspec-auto-review` share a single "CI fix" sub-agent, or keep CI fixing inline in each? (Current: inline — simpler, revisit if duplication is painful.)
- Should the init script write the `.gitignore` entry automatically, or instruct the user to add it? (Current lean: write it automatically, show what was added.)
