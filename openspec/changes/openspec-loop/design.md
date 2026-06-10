## Context

`openspec-auto` is a new repository containing Claude Code skill files and TypeScript tooling that implements an autonomous GitHub issue lifecycle agent. It has no prior codebase; all decisions here are greenfield. The system coordinates with the OpenSpec CLI and skills ecosystem, the `gh` CLI, and the Claude Code harness (worktree tools, Skill invocation, Agent spawning).

The design is informed by two constraints: (1) the Claude Code `/loop` mechanism re-reads the invoking skill on each iteration — so the main skill must be a slash command, not a file path; (2) context compression causes instruction drift across long runs — so expensive stages must run as isolated sub-agents with their own prompt files.

## Goals / Non-Goals

**Goals:**
- Autonomous issue lifecycle: triage → explore → propose → implement → review → wrap-up
- Resumable across runs: the PR's agent-state marker is the durable record; the loop reads no local state between runs (`state.json` is a within-run cache)
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

**Decision**: The `openspec-auto` orchestrator skill manages the stage state machine and delegates each expensive stage to a dedicated sub-agent (`triage`, `explore`, `propose`, `proposal-review`, `implement`, `code-review`). Sub-agents are invoked via the `Agent` tool, not the `Skill` tool directly.

**Rationale**: Each sub-agent runs in an isolated context window — no instruction drift, no accumulated context from prior phases. The orchestrator receives a structured result and advances the state machine. This mirrors how real pipelines work: a coordinator delegates to workers.

**Alternative considered**: Inline all phases into one large skill file. Rejected — context compression across a full implementation run (explore → 50 commits → review) would cause the agent to forget early instructions.

**Alternative considered**: Use the `Skill` tool to invoke sub-agents. Rejected — `Skill` loads instructions into the current context window (same agent), defeating isolation. `Agent` spawns a fresh context.

---

### D2: Sub-Agents Are Prompt Files, Not Skills

**Decision**: Each sub-agent is defined entirely by a prompt file under `skill/openspec-auto/prompts/` (`triage.md`, `explore.md`, `implement.md`, `review.md`). The orchestrator dispatches it with the `Agent` tool, filling `{{PLACEHOLDERS}}` with the context the sub-agent needs. There are no separate sub-agent `SKILL.md` files; `openspec-auto` is the only installed skill.

**Rationale**: The sub-agents are never invoked standalone — only the orchestrator dispatches them — so a separate skill layer added indirection (a prompt that points at a skill) with no benefit. This matches the superpowers `subagent-driven-development` model, where the prompt file *is* the sub-agent definition: one file per sub-agent, nothing to keep in sync.

**Supersedes**: an earlier design (this decision and D7) where each sub-agent was its own co-located `SKILL.md` invoked by name. That layer was removed once it was clear the sub-agents are pure orchestrator-dispatched roles.

---

### D3: Config File — `.openspec-auto.json`, Git-Ignored

**Decision**: A file `.openspec-auto.json` at the repo root carries per-project config (reviewer GitHub handle, default branch, future settings). It is git-ignored. A TypeScript `init` script creates it by inferring values from GitHub (`gh repo view`) and presenting them to the user for acceptance or override. One-time environment facts — like the repository's default branch — are detected here, so the loop reads them from config and is never encumbered by per-run setup detection.

**Rationale**: Config varies per project (different reviewers, default branches, future settings). Git-ignoring prevents accidental commits of reviewer handles or future sensitive values. The init script's GitHub-inference default makes setup nearly zero-friction, and pushing one-time detection into init keeps the hot loop simple and deterministic.

**Alternative considered**: Extend `openspec/config.yaml`. Rejected — that file belongs to the OpenSpec schema/CLI contract; mixing loop config there creates coupling.

**Alternative considered**: Environment variables. Rejected — verbose to set, invisible to the agent on re-invocation.

**Skill behavior on missing config**: Bring-up checks for `.openspec-auto.json`. If absent, the skill stops with: *"Config not found. Run `npx openspec-auto init` to set up."*

---

### D4: The PR is the cross-run record; `state.json` is a within-run cache

**Decision**: The loop carries **no state between runs**. The durable, cross-run record is the **PR's `<!-- agent-state: {...} -->` marker** (phase, issue, prNumber, branch, changeName, ciFixes, blocked). A new run discovers in-flight work by surveying open PRs (Triage), not by reading any local file. `state.json` under `.openspec-auto/` is only a **within-run cache** — created at Workspace (fresh) or reconstructed from the PR marker (resume), mirrored to the marker at every transition, and deleted at Teardown.

The **PR description** has two regions: the **agent-status block on top** (`## Agent Status` table + marker) and the **latest summary below it** — the discovery output after Explore, replaced by a post-proposal summary once Propose completes (see D5). It is overwritten as the run progresses, so it always shows the current picture — never an accreting log.

The **PR comments** hold the dialogue: blocking questions the agent raises, and the human's answers. (The description is *state*, the comments are *conversation*.)

**Only the orchestrator writes the PR.** Sub-agents return their output (discovery, proposal summary, blocking questions, deferred findings, CI-blocked summaries) and the orchestrator writes the description and posts comments. Sub-agents still commit and push branch contents where stated — that is not a PR write.

**Scripts**: `sync-pr-state.ts` updates the status block in place; `write-discovery.ts` overwrites the summary region. Both edit through `gh pr edit --body-file` (a temp file), so markdown with quotes, backticks, or `$` can't break shell quoting. Within a run, `state.json` keeps state reads off the network in the hot path.

**Rationale**: Putting the cross-run record on the PR makes the loop independent of any machine or local file — a run can resume on a different machine, and a leftover `state.json` from a crashed run is simply ignored (Bring-up never reads it; Triage rebuilds from the marker). This is simpler and more robust than treating a local file as the source of truth and bolting on crash recovery.

**Alternative considered**: local `state.json` as the cross-run source of truth with a PR-scan fallback (the earlier design). Rejected — it couples resumability to local files surviving between runs and needs a separate crash-recovery path; making the PR authoritative collapses both into one mechanism.

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
| `propose` | `PROPOSED`, `BLOCKED` |
| `proposal-review` | `APPROVED`, `CHANGES_REQUESTED` |
| `implement` | `DONE`, `BLOCKED`, `CI_BLOCKED` |
| `code-review` | `APPROVED`, `CHANGES_REQUESTED` |

**Rationale**: Status codes make orchestrator branching reliable without scripted parsing of prose. The pattern is taken directly from the superpowers `subagent-driven-development` skill, which uses `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`. Prose detail is for human observers and for the orchestrator to mine for specifics when needed (e.g., which blocking questions to post).

**Context is passed inline**: The orchestrator constructs each sub-agent's invocation prompt with all needed context (issue body, task list, PR number) pasted inline. Sub-agents do not read files the orchestrator didn't give them. This is the superpowers principle: "you construct exactly what they need."

**Alternative considered**: File-based handoff (sub-agent writes result JSON, orchestrator reads). Rejected — adds file I/O, cleanup contracts, and shared-state complexity. Status enum + prose handled by LLM is simpler and equally reliable for the data volumes involved.

---

### D7: One Prompt File Per Sub-Agent

**Decision**: Each sub-agent has its own prompt file (`prompts/triage.md`, etc.); they are not merged into a single parameterized prompt.

**Rationale**: The four sub-agents have genuinely different shapes. Triage and explore are stateless evaluation tasks. Implement is a stateful execution loop (delegates to `opsx:apply`, watches CI). Review delegates to `superpowers:requesting-code-review` and adds a scope filter. One file with mode branches would be long and mostly-irrelevant per dispatch; four focused files keep each prompt to what that role needs.

**Shared conventions** repeat in each file rather than being abstracted out: the "you have no prior context" framing, the `**Status:**` output contract, and the inline-context principle. (The `<SUBAGENT-STOP>` guard was dropped — it only made sense when these were invokable skills.)

---

### D8: Worktree Management — plain `git worktree`

**Decision**: Create the worktree via `superpowers:using-git-worktrees`; tear it down at the end of every run with plain `git worktree remove --force <path>` (general git, not a harness-specific tool). The worktree is not kept.

**Rationale**: Plain `git worktree` is portable and works in any environment, not only harness-managed sessions. Removing the worktree each run keeps the workspace clean and, with the PR marker as the durable record, nothing is lost — a resumed run re-establishes the worktree from the branch. `--force` covers the git-ignored scratch (`.openspec-auto/`).

---

### D9: State Machine Diagram in Main Skill — Mermaid

**Decision**: The main `openspec-auto` skill includes the phase state machine as a Mermaid diagram. Sub-agent skills include flow diagrams where they aid comprehension.

**Rationale**: Mermaid renders in GitHub PR previews and skill documentation. A visual state machine is the single best way to communicate the resume logic to a model reading the skill file.

---

### D10: `ciFixes` Counter Resets Per Implement Increment

**Decision**: The `ciFixes` field tracks CI fix attempts within the current Implement increment only. The orchestrator resets it to 0 before each Implement run — the initial one and every rerun driven by code-review's blocking findings. Only `implement` pushes and watches CI; reviews never do.

**Rationale**: Each implement increment is a distinct piece of work and deserves its own fair 3-attempt CI budget; carrying the count across increments would block a fresh increment on failures already resolved.

---

### D11: TypeScript for All Scripts, With Tests

**Decision**: All non-skill tooling (init script, state sync helper) is written in TypeScript. Each script has a corresponding test file. Tests use Node's built-in test runner (`node:test`).

**Rationale**: Testability is the primary driver — especially for the state sync script where a bug silently corrupts PR descriptions. TypeScript also catches type errors at build time. The whole repository will become an npm package, so the Node.js runtime is already a given. The built-in test runner avoids a Jest/Vitest dependency.

---

### D12: Delegate to superpowers/opsx; pick the model per sub-agent

**Decision**: The skills lean on existing skills rather than re-describing their logic. Propose delegates artifact generation to `opsx:propose` on the first run; reruns edit the existing artifacts directly (the change already exists, so `opsx:propose` is not re-invoked). Implement delegates the task loop to `opsx:apply`, run via `superpowers:subagent-driven-development` (a fresh sub-agent per task, each following `superpowers:test-driven-development`), and adds CI monitoring and commit/push as it goes (at least once per top-level task). Code review delegates to `superpowers:requesting-code-review` and adds only the scope/severity tagging. Wrap-up runs `superpowers:finishing-a-development-branch` before `opsx:archive`. After Propose, an independent fresh-context `proposal-review` sub-agent judges the artifacts before Implement begins. Each sub-agent is dispatched with the cheapest sufficient model: triage `haiku`; explore, propose, and implement `sonnet`; proposal-review and code-review `opus`.

**Rationale**: Re-implementing a task loop or review mechanics duplicates maintained behavior and drifts out of sync. The openspec-auto layer should carry only what is genuinely its own. Model selection follows the superpowers `subagent-driven-development` guidance — match model power to task complexity, with the reviews (design judgment, scope/severity calls) getting the strongest model.

---

### D13: Implementation loops vs. review steps; the orchestrator owns the loop

**Decision**: Two kinds of sub-agent. **Implementation loops** (`explore`, `propose`, `implement`) are rerunnable: each runs on a fresh context plus the current state and an optional `{{CHANGE_REQUEST}}`, producing or modifying artifacts/code. **Review steps** (`proposal-review`, `code-review`) are stateless: they read the current state, judge it, and return findings tagged blocking/minor — they never change anything. One layer of sub-agents, with one sanctioned exception: `implement` runs `opsx:apply` via `superpowers:subagent-driven-development`, which dispatches a sub-agent per task (each doing TDD). Every other sub-agent uses `Skill` in-context only and never spawns `Agent` sub-agents.

When a review returns `CHANGES_REQUESTED`, the orchestrator assesses the findings: **blocking** → rerun the matching loop with the findings as its change request, then re-review; **minor / out-of-scope / unclear** → post as open questions and proceed. After three consecutive blocking rounds on the same review, post a PR comment for human input and park (`NEEDS-INPUT`).

**Rationale**: Separating "make changes" (rerunnable loops) from "judge changes" (stateless reviews) keeps each role simple and gives a uniform feedback mechanism (`{{CHANGE_REQUEST}}`) across explore/propose/implement. The severity assessment stops the loop from spinning on non-essential improvements, and the 3-round cap converts a genuine impasse into a human hand-off rather than an infinite loop or a silent low-quality merge.

**Alternative considered**: reviewers that fix what they find (the earlier design). Rejected — a reviewer that also edits is not stateless, blurs responsibility, and can't be safely rerun; routing fixes back through `implement` keeps one place that changes code.

## Risks / Trade-offs

**R1: Worktree cleanup** → A crash before Teardown can leave a stale worktree. Mitigation: `superpowers:using-git-worktrees` reuses or cleans an existing worktree for the branch on resume, and `git worktree prune` clears dead entries.

**R2: OpenSpec skills not installed** → The init script checks that `opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive` are available in `~/.claude/skills/`. If any are missing, init warns and links to install instructions.

**R3: `gh` rate limiting** → Fetching 50 issues + comments per iteration could hit GitHub API limits on busy repos. Mitigation: `--limit 50` is already a cap; the skill can be tuned to `--limit 20` for high-volume repos.

**R4: Sub-agent context size** → A large codebase exploration could fill the `explore` sub-agent's context window before it produces output. Mitigation: the explore prompt explicitly scopes investigation to files/modules relevant to the issue, not a full repo crawl.

**R5: PR body size limits** → GitHub PR descriptions cap at ~65,000 chars. The description holds the agent-status block plus exactly one discovery output (overwritten each run, never accreting), so it stays bounded — a pathologically large discovery is the only risk. Mitigation: explore synthesizes rather than dumps, keeping the discovery proportionate to the issue; the dialogue lives in comments, not the body.

**R6: PR marker stale after a crash** → If a run crashes between a `state.json` write and the PR sync, the marker can lag by one transition. Mitigation: sync the marker immediately after each `state.json` write, so at worst a resumed run repeats the most recent stage (idempotent) rather than losing work.

## Open Questions

- Should the init script write the `.gitignore` entry automatically, or instruct the user to add it? (Current lean: write it automatically, show what was added.)
