## Context

The current flow is: **Triage → Workspace (branch + draft PR) → Explore**. Workspace runs unconditionally after Triage selects an issue; it creates the branch, an empty commit, and a draft PR before a single line of investigation has happened. When Explore hits a blocking question (NEEDS_INPUT), all that infrastructure exists solely to hold an agent-state marker and a comment thread — a draft PR with no code and no meaningful description, visible in the PR list.

The proposed flow is: **Triage → Explore-on-issue → Workspace → Propose → ...** where Explore now runs against the bare issue, posting any blocking questions as issue comments (with the same `<!-- agent-state: … -->` marker format already used in PRs). The Workspace is only created after Explore succeeds (EXPLORED), and it is seeded with the discovery output immediately on creation.

Key invariants that must be preserved:
- "The PR is the durable record" — once a Workspace exists, the PR body remains the canonical state record. This design only moves the *start* of the conversation to the issue.
- The `<!-- agent-state: … -->` marker format must remain stable — existing PR-based resumes must not break.
- `survey.ts` returns a flat list of `SurveyRow`; triage reasons over it. The shape of `SurveyRow` is the interface contract between survey and triage.

## Goals / Non-Goals

**Goals:**
- Eliminate the "codeless draft PR" phase for issues that need clarification.
- Keep issue refinement on the issue (visible to anyone watching the issue, not hidden in a PR).
- Preserve the existing PR-based resume path unchanged.
- Add one new resume case: an issue whose comments contain an agent-state `NEEDS_INPUT` marker with a human reply.
- Maintain backward compatibility with existing in-flight PRs — the old flow and new flow coexist while PRs from before this change are still open.

**Non-Goals:**
- Changing the PR-based state machine after Workspace is created. Once a PR exists, all behavior is unchanged.
- Storing Explore's full discovery output in the issue (too much noise on the issue thread — only blocking questions go there). The discovery output is written to the PR description at Workspace creation time.
- Handling multi-issue parallelism (the loop already processes one issue at a time).
- Changing the `setup-workspace.ts` script's interface or the PR structure.

## Decisions

### Agent-state marker on the issue comment (same format as PR)

The simplest approach: reuse the existing `<!-- agent-state: { "phase": "NEEDS_INPUT", "blocked": true, … } -->` format in an issue comment. `parseAgentState` in `survey.ts` already handles this format. The orchestrator searches issue comments for the marker the same way it searches PR bodies.

**Why not a separate format or a separate JSON field?** Reusing the format means `parseAgentState` needs no changes, and triage's resume logic is a thin extension ("look for marker in issue comments when `agentPr` is null") rather than a new code path.

**What goes in the marker?** The pre-Workspace marker carries: `phase: "NEEDS_INPUT"`, `blocked: true`, `issue: N`. It does not carry `prNumber`, `branch`, or `changeName` (those don't exist yet). The orchestrator knows which issue to resume from the issue number in the survey row — it doesn't need those fields.

### Discovery output is NOT written to the issue

Only the blocking questions (the NEEDS_INPUT comment body from Explore) are posted to the issue. The full discovery output is held in memory until Workspace is created, then written to the PR description. This keeps the issue thread readable and avoids a large technical dump in the issue.

**Why not store discovery in the issue?** Issues are public-facing; a large synthesis document as a comment adds noise before there's a PR to anchor it. The PR description is the designed home for it.

### Label `agent-investigating` added at Explore start, removed at Workspace creation

Adding a label gives the issue a visible signal in the issue list ("the agent is looking at this") without creating a PR. Removing the label when the Workspace is created keeps the label accurate — at that point the PR draft becomes the visible signal.

**Why remove at Workspace, not at EXPLORED?** Between Explore returning EXPLORED and Workspace creation completing, there's a brief window; the label removal is a natural part of the Workspace setup sequence. Leaving the label through Workspace creation would require a separate cleanup step later.

**Label creation:** The label must exist in the repo before it can be applied. The orchestrator creates it if absent (using `gh label create`) before the first apply. This is a one-time idempotent setup step that belongs in Bring-up.

### `SurveyRow` gains an `agentIssueState` field (alongside `agentPr`)

Rather than conflating the two cases in `agentPr`, a second field `agentIssueState` carries the pre-Workspace agent state (phase + blocked, extracted from an issue comment). This keeps the triage prompt unambiguous: "if `agentPr` is non-null, the PR is the record; if `agentIssueState` is non-null and `agentPr` is null, the issue is mid-Explore."

**Why not reuse `agentPr`?** `AgentPr` carries `number` (PR number) and `comments` (PR comments) — there is no PR yet. A separate field with a narrower type (`{ phase, blocked }`) is cleaner and keeps triage's existing PR-based logic unchanged.

### Triage returns `RESUME` with a new `target: issue` vs `target: pr` annotation

The orchestrator needs to know *what* to resume. The existing `RESUME` output already carries `PR: #N`. Adding `Target: issue #N` (or `Target: pr #N` for existing cases) distinguishes the two without adding a new status. The orchestrator branches on this to either re-enter Explore-on-issue or go to Workspace resume.

**Why not a new status like `RESUME_ISSUE`?** A new status requires updating the orchestrator's branch table in SKILL.md. An annotation on the existing `RESUME` output achieves the same disambiguation with smaller surface area.

### `{{PR_CONTEXT}}` in `explore.md` becomes `{{PRIOR_CONTEXT}}`

The placeholder currently describes PR content. On first run it's empty; on a resume it holds prior discovery + PR comments. After this change, a resume may hold prior discovery + *issue* comments (before a PR exists). Renaming the placeholder to `{{PRIOR_CONTEXT}}` with updated documentation that covers both cases avoids confusion.

## Risks / Trade-offs

- **Explore is now stateless across the network boundary** — it runs without a worktree (no git state, no code). Explore's `opsx:explore` skill already works this way (it reads the repo via the filesystem, passed as `REPO_PATH`). The orchestrator must still pass `REPO_PATH` correctly. → No additional mitigation needed beyond confirming the path is passed.
- **Issue comment thread ordering** — when Explore-on-issue posts a blocking-questions comment, a human's reply must come *after* it for the resume logic to detect it. The survey already orders comments by `createdAt`; the detection logic (a comment from a non-agent author newer than the agent's marker comment) is already used for PR-based NEEDS_INPUT. → Reuse the same detection logic.
- **Label race** — if two loop runs start simultaneously for the same issue, both might try to add the label and create the Workspace. The existing `setup-workspace.ts` duplicate guard (scanning open PRs for this issue's agent-state marker) prevents double Workspace creation. The label add is idempotent. → Existing guard covers this.
- **Issues with both `agentPr` and `agentIssueState`** — impossible in steady state (Workspace removes the label and from that point the PR is the record), but could occur if a run crashed between Explore posting the issue comment and the Workspace step completing. → Survey logic: if `agentPr` is non-null, always prefer it; only use `agentIssueState` when `agentPr` is null.

## Migration Plan

No migration needed for in-flight PRs. Issues that already have an agent PR continue through the existing PR-based path. New selections after this change lands use the new Explore-on-issue path. The two paths coexist naturally because the branch point is Triage's resume logic: `agentPr` vs `agentIssueState`.

The `agent-investigating` label must be created in the target repo before the first run after this change. The Bring-up stage creates it idempotently.

## Open Questions

(none)
