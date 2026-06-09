# openspec-auto

Resolve one GitHub issue end-to-end, autonomously, with a full OpenSpec paper trail: triage an issue, gather requirements, write a proposal, implement it test-first, review it, and hand a ready PR to a human.

**Why an orchestrator + sub-agents:** Each expensive stage (triage, explore, implement, review) runs as a fresh sub-agent with an isolated context window. You — the orchestrator — hold only the state machine and the structured result each sub-agent returns. Sub-agents never inherit your history; you construct exactly the context they need from a prompt template. This prevents the instruction drift that destroys long single-context runs.

**Core principle:** One issue per invocation. Local `state.json` is the source of truth; the PR description is the human-visible checkpoint; each stage advances the state machine by branching on the sub-agent's `**Status:**` line.

**Continuous execution:** Do not pause to check in with your human between stages. Run the whole machine. The only reasons to stop are the four terminal conditions in **Stopping Conditions** below — otherwise keep going.

## The Process

```mermaid
flowchart TD
    A[Assess state] -->|resumable PR| R[Resume at saved stage]
    A -->|nothing in flight| T[Triage: pick an issue]
    R --> X((rejoin machine))

    T -->|NO_ELIGIBLE / NEEDS_CONTEXT| Z[Teardown]
    T -->|SELECTED| W[Set up workspace: branch + draft PR]

    W --> E[Explore: gather requirements]
    E -->|EXPLORED_WITH_CONCERNS| NI[Post blocking questions → NEEDS-INPUT] --> Z
    E -->|EXPLORED| P[Propose: opsx:propose + artifact review]

    P --> I[Implement: opsx:apply + CI watch]
    I -->|BLOCKED / CI_BLOCKED| Z
    I -->|DONE| V[Review: requesting-code-review + scope filter]

    V -->|CHANGES_REQUESTED| V
    V -->|CI_BLOCKED| Z
    V -->|APPROVED| F[Wrap up: finish branch, archive, assign reviewer]

    F --> Z[Teardown: exit worktree, return to main]
    Z --> S{Schedule next?}
    S -->|work done| K[Wake in 30m]
    S -->|no eligible issues| L[Wake in 2h]
    S -->|terminal stop| H[Stop, no wakeup]
```

## Model Selection

Dispatch each sub-agent with the cheapest model that fits the work:

| Sub-agent | Model | Why |
|-----------|-------|-----|
| triage    | haiku  | Mechanical fetch + filter, no design judgment |
| explore   | sonnet | Codebase reading and requirement judgment |
| implement | sonnet | Coordinates `opsx:apply`, integration work |
| review    | opus   | Design judgment and scope categorization — highest stakes |

## Handling Sub-Agent Status

Every sub-agent returns a `**Status:**` line. Branch on it. If a sub-agent returns no recognizable status, treat the stage as failed and go to Teardown.

| Sub-agent | Status | Action |
|-----------|--------|--------|
| triage    | `SELECTED` | Read issue #, branch prefix, slug from prose → **Set up workspace** |
| triage    | `NO_ELIGIBLE` | Teardown, schedule 2h wakeup |
| triage    | `NEEDS_CONTEXT` | GitHub unreachable — print the error, stop, no wakeup |
| explore   | `EXPLORED` | → **Propose** |
| explore   | `EXPLORED_WITH_CONCERNS` | Read blocking questions from prose, post to PR, set `NEEDS-INPUT` + `blocked:true`, Teardown, no wakeup |
| implement | `DONE` | → **Review** |
| implement | `BLOCKED` | Set `blocked:true`, Teardown, no wakeup |
| implement | `CI_BLOCKED` | Set `CI-BLOCKED` + `blocked:true`, Teardown, no wakeup |
| review    | `APPROVED` | → **Wrap up** |
| review    | `CHANGES_REQUESTED` | Sub-agent already implemented fixes; confirm CI green, re-dispatch review once |
| review    | `CI_BLOCKED` | Set `CI-BLOCKED` + `blocked:true`, Teardown, no wakeup |

## The Stages

Each stage updates `state.json` to the new phase and syncs it to the PR *before* doing the stage's work (see **State & Scripts**). Sub-agent stages are dispatched with the `Agent` tool using the matching prompt template and model.

**Assess state.** Read config; if `.openspec-auto.json` is missing, stop and tell the user to run init. Read local `state.json`: if it exists, `blocked:false`, and phase isn't `COMPLETE`, resume at that stage. If `blocked:true` or `COMPLETE`, discard it and triage fresh. If there's no local state, scan open PRs for an `<!-- agent-state: … -->` marker (crash recovery) and resume from a reconstructed file; otherwise triage.

**Triage.** Dispatch the triage sub-agent (`prompts/triage.md`). It picks one eligible issue.

**Set up workspace.** Run `setup-workspace.ts` — it checks out main, creates the `<prefix>/<issue>-<slug>` branch, anchors an empty commit, opens the draft PR, and initializes `state.json`. Then enter an isolated workspace with `superpowers:using-git-worktrees`.

**Explore.** Dispatch the explore sub-agent (`prompts/explore.md`) with the issue body and comments inline.

**Propose.** Invoke `opsx:propose` to generate the proposal, specs, design, and tasks. Commit the artifacts, record the `changeName` in state, then spawn a brief Agent to sanity-check that the tasks are clear and implementable; fix the artifacts if it flags gaps.

**Implement.** Dispatch the implement sub-agent (`prompts/implement.md`).

**Review.** Reset `ciFixes` to 0, mark the PR ready (`gh pr ready`), then dispatch the review sub-agent (`prompts/review.md`).

**Wrap up.** Set phase `COMPLETE` and sync. Invoke `superpowers:finishing-a-development-branch`, then `opsx:archive`, then assign the reviewer (`gh pr edit --add-reviewer <reviewer>`).

**Teardown — always runs.** `ExitWorktree({ action: "keep" })`, check out main, pull. Then schedule per **Stopping Conditions**.

## Stopping Conditions

After Teardown, schedule the next wakeup with `ScheduleWakeup` — *unless* a terminal stop applies, in which case print why and schedule nothing.

- **Work completed** (success, NEEDS-INPUT, or CI-BLOCKED reached) → wake in 30 minutes.
- **No eligible issues** → wake in 2 hours.
- **Terminal stops — no wakeup:** every open issue is in-flight or ineligible; `gh` auth expired (any `gh` command returned an auth error); `NEEDS-INPUT` entered; `CI-BLOCKED` entered.

## Prompt Templates

Dispatch sub-agents by filling the `{{PLACEHOLDERS}}` in these and passing the result as the `Agent` prompt:

- `prompts/triage.md`
- `prompts/explore.md`
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
| `sync-pr-state.ts <PR>` | Render the `## Agent Status` table + marker into the PR body |
| `setup-workspace.ts <issue> <branch> <title>` | Branch + empty commit + draft PR + init state |

**State update protocol:** on every stage transition, `write-state.ts` first, then `sync-pr-state.ts <PR>` once a PR exists. First-time setup: `cd $OSL && npm install`.

## Red Flags

- **Never resume a `blocked:true` or `COMPLETE` issue** — triage a fresh one.
- **Never skip Teardown** — it runs on every exit path, including terminal stops.
- **Never start Review before implement returns `DONE`**, or Wrap-up before Review returns `APPROVED`.
- **Never schedule a wakeup on a terminal stop** — NEEDS-INPUT and CI-BLOCKED wait for a human.
- **Never let a sub-agent read your context** — pass everything it needs through its prompt template.
- **Never carry `ciFixes` across stages** — it resets to 0 when Review begins.

## Integration

| Skill | Stage | Model |
|-------|-------|-------|
| `openspec-auto-triage` sub-agent | Triage | haiku |
| `superpowers:using-git-worktrees` | Set up workspace | — |
| `openspec-auto-explore` sub-agent | Explore | sonnet |
| `opsx:propose` | Propose | — |
| `openspec-auto-implement` sub-agent | Implement | sonnet |
| `openspec-auto-review` sub-agent | Review | opus |
| `superpowers:finishing-a-development-branch` | Wrap up | — |
| `opsx:archive` | Wrap up | — |
