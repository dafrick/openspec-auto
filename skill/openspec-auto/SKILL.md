# openspec-auto

Resolve one GitHub issue end-to-end, autonomously, with a full OpenSpec paper trail: triage an issue, gather requirements, propose a change, implement it test-first, review it, and hand a ready PR to a human.

**Why an orchestrator + sub-agents:** Each expensive stage runs as a fresh sub-agent with its own context window. You — the orchestrator — hold only the state machine and the result each sub-agent returns. Sub-agents never inherit your history; you build their context from a prompt template. This prevents the instruction drift that breaks long single-context runs.

**Core principle:** One issue per invocation. `state.json` is the source of truth. The PR description is the human-visible checkpoint — the agent-status block on top, the latest summary below it (the discovery output, then a post-proposal summary) — overwritten as the run progresses, so it always reflects where things stand. The PR comments hold the dialogue: blocking questions the agent raises and the human's answers. **Only the orchestrator writes to the PR** — sub-agents return their output and the orchestrator updates the description and posts comments. Each stage writes its phase, then branches on the sub-agent's `**Status:**` line.

**Continuous execution:** Don't check in with your human between stages. Run the whole machine. Stop only on the terminal conditions in **Stopping Conditions** — otherwise keep going.

## The Process

```mermaid
flowchart TD
    A[Assess] -->|resumable state| RJ((resume at saved stage))
    A -->|answered NEEDS-INPUT PR| E[Explore]
    A -->|nothing in flight| T[Triage]

    T -->|SELECTED| W[Workspace]
    T -->|NO_ELIGIBLE / NEEDS_CONTEXT| Z[Teardown]

    W --> E
    E -->|EXPLORED| P[Propose]
    E -->|NEEDS_INPUT| Z

    P -->|PROPOSED| PV[Proposal review]
    P -->|BLOCKED| Z
    PV -->|APPROVED| I[Implement]
    PV -->|CHANGES_REQUESTED| P
    I -->|DONE| V[Review]
    I -->|BLOCKED / CI_BLOCKED| Z

    V -->|APPROVED| F[Wrap up]
    V -->|CHANGES_REQUESTED| V
    V -->|CI_BLOCKED| Z

    F --> Z
    Z --> S{Schedule next?}
    S -->|work done| K[Wake 30m]
    S -->|no eligible issues| L[Wake 2h]
    S -->|terminal stop| H[Stop]
```

Stage names match the `phase` they write to `state.json`: **Workspace → `WORKSPACE`**, **Explore → `EXPLORE`**, **Propose → `PROPOSE`**, **Implement → `IMPLEMENT`**, **Review → `REVIEW`**, **Wrap up → `COMPLETE`**. The failure exits write `NEEDS-INPUT` or `CI-BLOCKED`. Assess, Triage, and Teardown run before or after the PR exists and write no phase.

## Model Selection

Dispatch each sub-agent with the cheapest model that fits the work:

| Sub-agent | Model | Why |
|-----------|-------|-----|
| triage    | haiku  | Mechanical fetch + filter, no design judgment |
| explore   | sonnet | Codebase reading and requirement judgment |
| propose   | sonnet | Structures the discovery into OpenSpec artifacts |
| proposal-review | opus | Independent judgment on whether the proposal is sound |
| implement | sonnet | Integration work, coordinates the change |
| review    | opus   | Design judgment and scope calls — highest stakes |

## Handling Sub-Agent Status

Every sub-agent returns a `**Status:**` line. Branch on it. An unrecognized status means the stage failed — go to Teardown.

| Sub-agent | Status | Action |
|-----------|--------|--------|
| triage    | `SELECTED` | Read issue #, branch prefix, slug from prose → **Workspace** |
| triage    | `NO_ELIGIBLE` | Teardown, wake in 2h |
| triage    | `NEEDS_CONTEXT` | GitHub unreachable — print the error, stop, no wakeup |
| explore   | `EXPLORED` | Write discovery to the PR description → dispatch **Propose** with the discovery |
| explore   | `NEEDS_INPUT` | Write discovery to the PR description, post blocking questions as a PR comment, write `NEEDS-INPUT` + `blocked:true`, Teardown, no wakeup |
| propose   | `PROPOSED` | Record `changeName`; write the proposal summary to the PR description → **Proposal review** |
| propose   | `BLOCKED` | Write `blocked:true`, Teardown, no wakeup |
| proposal-review | `APPROVED` | → **Implement** |
| proposal-review | `CHANGES_REQUESTED` | Re-dispatch Propose with the feedback (cap 2 rounds, then proceed to Implement) |
| implement | `DONE` | → **Review** |
| implement | `BLOCKED` | Write `blocked:true`, Teardown, no wakeup |
| implement | `CI_BLOCKED` | Write `CI-BLOCKED` + `blocked:true`, post the summary comment, Teardown, no wakeup |
| review    | `APPROVED` | Post the Deferred / Left-for-human notes as PR comments → **Wrap up** |
| review    | `CHANGES_REQUESTED` | Post the Deferred / Left-for-human notes; sub-agent already pushed in-scope fixes; confirm CI green, re-dispatch review once |
| review    | `CI_BLOCKED` | Write `CI-BLOCKED` + `blocked:true`, post the summary comment, Teardown, no wakeup |

## The Stages

Each stage writes its phase to `state.json` and syncs it to the PR, then does its work. Sub-agent stages are dispatched with the `Agent` tool, the matching prompt template, and the model from **Model Selection**.

**Assess.** Read config; if `.openspec-auto.json` is missing, stop and tell the user to run init. Then decide what to work on:
- **Local `state.json`, `blocked:false`, phase ≠ `COMPLETE`** → resume that stage.
- **Phase `COMPLETE` or `CI-BLOCKED`** → a human owns it; ignore and look for other work.
- **Phase `NEEDS-INPUT`** → resume at **Explore** *only if* the PR has a human comment newer than the agent's blocking-questions comment (the questions were answered); otherwise leave it parked.
- **No local state** → scan open PRs for an `<!-- agent-state: … -->` marker and apply the same per-phase rules (crash recovery): reconstruct `state.json` and resume, or, for an answered `NEEDS-INPUT` PR, resume at Explore.
- **Nothing to resume** → Triage.

**Triage.** Dispatch the triage sub-agent (`prompts/triage.md`). It picks one eligible issue.

**Workspace.** Run `setup-workspace.ts` — it checks out main, creates the `<prefix>/<issue>-<slug>` branch, anchors an empty commit, opens the draft PR, and writes the initial `state.json`. Then enter an isolated workspace with `superpowers:using-git-worktrees`.

**Explore.** Dispatch the explore sub-agent (`prompts/explore.md`) with the issue body and comments inline; on a resume, also fill `{{PR_CONTEXT}}` with the PR description (prior discovery) and all PR comments. On return, write the discovery output into the PR description with `write-discovery.ts`. Then: `EXPLORED` → pass the discovery inline to Propose; `NEEDS_INPUT` → post the blocking questions as a PR comment, write `NEEDS-INPUT` + `blocked:true`, and park (Teardown, no wakeup).

**Propose.** Dispatch the propose sub-agent (`prompts/propose.md`) with the issue ref, PR number, and the discovery output. It runs `opsx:propose` grounded in the discovery, commits and pushes the artifacts itself, and returns the change name plus a proposal summary. On `PROPOSED`: record `changeName`, and write the proposal summary into the PR description with `write-discovery.ts` (overwriting the discovery — the description now reflects the post-proposal understanding). Then dispatch the proposal-review sub-agent (`prompts/proposal-review.md`) for an independent, fresh-context check. `APPROVED` → Implement. `CHANGES_REQUESTED` → re-dispatch Propose with the feedback, then re-review; after a second round, proceed to Implement. `BLOCKED` (from Propose) → Teardown.

**Implement.** Dispatch the implement sub-agent (`prompts/implement.md`).

**Review.** Reset `ciFixes` to 0, mark the PR ready (`gh pr ready`), then dispatch the review sub-agent (`prompts/review.md`).

**Wrap up.** Invoke `superpowers:finishing-a-development-branch`, then `opsx:archive`, then assign the reviewer (`gh pr edit --add-reviewer <reviewer>`).

**Teardown — always runs.** `ExitWorktree({ action: "keep" })`, check out main, pull, then schedule per **Stopping Conditions**.

## Stopping Conditions

After Teardown, schedule the next wakeup with `ScheduleWakeup` — unless a terminal stop applies, in which case print why and schedule nothing.

- **Work completed** (success, NEEDS-INPUT, or CI-BLOCKED) → wake in 30 minutes.
- **No eligible issues** → wake in 2 hours.
- **Terminal stops — no wakeup:** every open issue is in-flight or ineligible; `gh` auth expired (any `gh` command returned an auth error); `NEEDS-INPUT` entered; `CI-BLOCKED` entered.

## Prompt Templates

Each sub-agent is defined entirely by its prompt file — there are no separate sub-agent skills. Fill the `{{PLACEHOLDERS}}` and pass the result as the `Agent` prompt:

- `prompts/triage.md`
- `prompts/explore.md`
- `prompts/propose.md`
- `prompts/proposal-review.md`
- `prompts/implement.md`
- `prompts/review.md`

## State & Scripts

`state.json` lives in `.openspec-auto/` and carries `phase`, `issue`, `prNumber`, `branch`, `changeName`, `ciFixes`, `blocked`. Valid phases: `WORKSPACE`, `EXPLORE`, `NEEDS-INPUT`, `PROPOSE`, `IMPLEMENT`, `REVIEW`, `COMPLETE`, `CI-BLOCKED`.

Scripts live in this skill's directory. Set the base once, then call:

```bash
OSL=~/.claude/skills/openspec-auto
$OSL/node_modules/.bin/tsx $OSL/scripts/<name>.ts [args]
```

| Script | Purpose |
|--------|---------|
| `read-state.ts` | Read and validate `state.json` |
| `write-state.ts '<json>'` | Write `state.json` (rejects invalid phases) |
| `sync-pr-state.ts <PR>` | Update the `## Agent Status` block (top of the PR body) in place |
| `write-discovery.ts <PR> <file>` | Overwrite the PR body: status block on top, discovery output below |
| `setup-workspace.ts <issue> <branch> <title>` | Branch + empty commit + draft PR + initial state |

**State update protocol:** on every stage transition, `write-state.ts` first, then `sync-pr-state.ts <PR>`. First-time setup: `cd $OSL && npm install`.

## Red Flags

- **Never resume a `CI-BLOCKED` or `COMPLETE` issue** — a human owns those; triage a fresh one. A `NEEDS-INPUT` PR *is* resumable, but only once the human has answered its blocking questions.
- **Never skip Teardown** — it runs on every exit, including terminal stops.
- **Never start Review before Implement returns `DONE`**, or Wrap up before Review returns `APPROVED`.
- **Never schedule a wakeup on a terminal stop** — NEEDS-INPUT and CI-BLOCKED wait for a human.
- **Never let a sub-agent read your context** — pass everything through its prompt template.
- **Never let a sub-agent edit the PR** — only the orchestrator writes the description and posts comments; sub-agents return their output and you write it.
- **Never carry `ciFixes` across stages** — it resets to 0 when Review begins.

## Integration

The sub-agents are prompt files (see **Prompt Templates**), not skills. The skills the loop leverages:

| Skill | Stage | Invoked by |
|-------|-------|-----------|
| `superpowers:using-git-worktrees` | Workspace | orchestrator |
| `opsx:propose` | Propose | propose sub-agent |
| `opsx:apply` | Implement | implement sub-agent |
| `superpowers:test-driven-development` | Implement | `opsx:apply` |
| `superpowers:requesting-code-review` | Review | review sub-agent |
| `superpowers:finishing-a-development-branch` | Wrap up | orchestrator |
| `opsx:archive` | Wrap up | orchestrator |
