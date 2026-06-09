## Context

`openspec-loop` is a new repository containing Claude Code skill files and TypeScript tooling that implements an autonomous GitHub issue lifecycle agent. It has no prior codebase; all decisions here are greenfield. The system coordinates with the OpenSpec CLI and skills ecosystem, the `gh` CLI, and the Claude Code harness (worktree tools, Skill invocation, Agent spawning).

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

**Decision**: The main `openspec-loop` skill manages the phase state machine and delegates each expensive phase to a dedicated sub-agent skill (`openspec-loop-triage`, `openspec-loop-explore`, `openspec-loop-implement`, `openspec-loop-review`). Sub-agents are invoked via the `Agent` tool, not the `Skill` tool directly.

**Rationale**: Each sub-agent runs in an isolated context window — no instruction drift, no accumulated context from prior phases. The main loop receives a structured result and advances the state machine. This mirrors how real pipelines work: a coordinator delegates to workers.

**Alternative considered**: Inline all phases into one large skill file. Rejected — context compression across a full implementation run (explore → 50 commits → review) would cause the agent to forget early instructions.

**Alternative considered**: Use the `Skill` tool to invoke sub-agents. Rejected — `Skill` loads instructions into the current context window (same agent), defeating isolation. `Agent` spawns a fresh context.

---

### D2: Sub-Agent Skills Are Proper Skill Files

**Decision**: Each sub-agent is a `SKILL.md` file (e.g., `skill/openspec-loop-explore/SKILL.md`) co-located in the repository. The main loop invokes them by passing the skill name to the `Agent` tool with a prompt instructing the sub-agent to invoke its skill.

**Rationale**: Skill files are the documented, re-readable contract for a sub-agent's behavior. They can be independently maintained, documented with Mermaid diagrams, and later skilletized. Embedding sub-agent instructions inline in the main skill would make it unmaintainably long.

---

### D3: Config File — `.openspec-loop.json`, Git-Ignored

**Decision**: A file `.openspec-loop.json` at the repo root carries per-project config (reviewer GitHub handle, etc.). It is git-ignored. A TypeScript `init` script creates it by inferring values from GitHub (`gh repo view`) and presenting them to the user for acceptance or override.

**Rationale**: Config varies per project (different reviewers, future settings). Git-ignoring prevents accidental commits of reviewer handles or future sensitive values. The init script's GitHub-inference default makes setup nearly zero-friction.

**Alternative considered**: Extend `openspec/config.yaml`. Rejected — that file belongs to the OpenSpec schema/CLI contract; mixing loop config there creates coupling.

**Alternative considered**: Environment variables. Rejected — verbose to set, invisible to the agent on re-invocation.

**Skill behavior on missing config**: Phase 0 checks for `.openspec-loop.json`. If absent, the skill stops with: *"Config not found. Run `npx openspec-loop init` to set up."*

---

### D4: State Management — Local File as Source of Truth, PR as Checkpoint

**Decision**: Agent state is stored in `.openspec-loop/state.json` at the worktree root. This file is the source of truth. A TypeScript script `scripts/sync-pr-state.ts` reads from `state.json` and updates the PR description at key phase transitions. Phase 0 reads the local file first; if absent (crash recovery path), it falls back to scanning open GitHub PRs for agent-state markers.

**State file fields**: `phase`, `issue`, `prNumber`, `branch`, `changeName`, `ciFixes`, `blocked`.

**Rationale**: Decouples state reads from GitHub API calls. Phase transitions update a local file (fast, no network), then periodically sync to the PR description (network, at phase boundaries). The PR description remains the human-visible status for anyone browsing GitHub. The local file survives context compression; the PR body survives worktree removal.

**Crash recovery**: If `.openspec-loop/state.json` is absent (worktree was force-removed, or new session on a different machine), Phase 0 scans open PRs for `<!-- agent-state: {...} -->` markers. Found state is written back to a new local `state.json` before resuming.

**Alternative considered**: PR description as sole source of truth. Rejected — every state read requires a GitHub API call; rate limiting and auth expiry become failure modes in the hot path.

**Alternative considered**: Bash one-liners for the sync script. Rejected — quoting the full PR body through shell heredocs causes escaping bugs with embedded JSON and markdown; TypeScript is testable and reliable.

---

### D5: Explore Sub-Agent — Autonomous Q&A with Natural Language Output

**Decision**: `openspec-loop-explore` generates questions appropriate for the issue type (bug vs feature) and answers each from codebase investigation. Output is natural language — no rigid schema or machine-parseable format. The only structural requirement is that the output MUST end with a `## Blocking Questions` section listing any questions that require human input before implementation can proceed. If there are none, the section reads "(none)".

**The orchestrator's contract**: After the explore sub-agent returns, the main loop reads the sub-agent's output and checks whether the `## Blocking Questions` section has content beyond "(none)". If it does, the loop enters NEEDS-INPUT. The orchestrator uses LLM understanding to read this section — not scripted parsing.

**Rationale**: Overly structured output formats are brittle. Models drift from strict JSON or enumerated headings under real workloads. Natural language with one required section is the right balance — the section heading is easy for a model to produce consistently, and the orchestrator can read it reliably without fragile regex. Treating explore as a pass-through produces no signal above what the issue body already contains.

---

### D6: Worktree Management — `ExitWorktree` Tool

**Decision**: Use the Claude Code harness `ExitWorktree` tool with `action: "keep"` for teardown. Document `git worktree remove <path>` as the manual fallback.

**Rationale**: `ExitWorktree` integrates with the harness's worktree tracking and handles edge cases (uncommitted changes, lock files). Prefer harness tools over equivalent bash where available.

---

### D7: State Machine Diagram in Main Skill — Mermaid

**Decision**: The main `openspec-loop` skill includes the phase state machine as a Mermaid diagram. Sub-agent skills include flow diagrams where they aid comprehension.

**Rationale**: Mermaid renders in GitHub PR previews and skill documentation. A visual state machine is the single best way to communicate the resume logic to a model reading the skill file.

---

### D8: `ciFixes` Counter Resets Per Phase

**Decision**: The `ciFixes` field in agent-state tracks CI fix attempts within the current phase only. It resets to 0 when Phase 6 starts.

**Rationale**: A failure in Phase 5 implementation is a different failure mode from a failure in Phase 6 post-review. Cumulative counting would block Phase 6 on issues already resolved. Per-phase counting gives each phase a fair 3-attempt budget.

---

### D9: TypeScript for All Scripts, With Tests

**Decision**: All non-skill tooling (init script, state sync helper) is written in TypeScript. Each script has a corresponding test file. Tests use Node's built-in test runner (`node:test`).

**Rationale**: Testability is the primary driver — especially for the state sync script where a bug silently corrupts PR descriptions. TypeScript also catches type errors at build time. The whole repository will become an npm package, so the Node.js runtime is already a given. The built-in test runner avoids a Jest/Vitest dependency.

## Risks / Trade-offs

**R1: Harness tool availability** → The `ExitWorktree` tool is only available inside harness-managed sessions. Documented fallback: `git worktree remove <path>`. If the harness is absent, the agent falls back gracefully.

**R2: OpenSpec skills not installed** → The init script checks that `opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive` are available in `~/.claude/skills/`. If any are missing, init warns and links to install instructions.

**R3: `gh` rate limiting** → Fetching 50 issues + comments per iteration could hit GitHub API limits on busy repos. Mitigation: `--limit 50` is already a cap; the skill can be tuned to `--limit 20` for high-volume repos.

**R4: Sub-agent context size** → A large codebase exploration in `openspec-loop-explore` could fill a sub-agent's context window before producing output. Mitigation: the explore skill explicitly scopes investigation to files/modules relevant to the issue, not a full repo crawl.

**R5: PR body size limits** → GitHub PR descriptions have a character limit (~65,000). A description with Mermaid diagrams + long implementation notes could hit this. Mitigation: keep the agent-state block minimal; the full write-up goes in wrap-up only.

**R6: state.json lost on force-remove** → If a worktree is force-removed mid-run (e.g., manual cleanup), `.openspec-loop/state.json` is lost. Phase 0's GitHub PR scan fallback recovers from this, but only if the PR was synced before the loss. Mitigation: sync to PR description at every phase transition (not just periodically).

## Open Questions

- Should `openspec-loop-implement` and `openspec-loop-review` share a single "CI fix" sub-agent, or keep CI fixing inline in each? (Current: inline — simpler, revisit if duplication is painful.)
- Should the init script write the `.gitignore` entry automatically, or instruct the user to add it? (Current lean: write it automatically, show what was added.)
