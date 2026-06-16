## Why

When Explore hits a blocking question, the current flow has already created a branch and draft PR — a codeless shell whose only purpose is to hold the `<!-- agent-state -->` marker and the blocking-questions comment. This is a visible artifact with nothing in it, which signals "work in progress" before any meaningful progress has been made. Moving Explore to run against the bare issue (before a Workspace exists) keeps issue refinement on the issue, eliminates the premature draft PR, and makes the issue itself the visible record of investigation.

## What Changes

- **Explore runs before Workspace.** After Triage returns `SELECTED`, the orchestrator runs Explore directly against the issue — no branch, no PR, no worktree yet.
- **Blocking questions are posted to the issue.** When Explore returns `NEEDS_INPUT`, the orchestrator posts the blocking questions as an issue comment with an `<!-- agent-state -->` marker (same format as PR markers, so the same parsing logic applies). An `agent-investigating` label is added to the issue for visibility.
- **Survey extended to detect pre-Workspace issues.** `survey.ts` reads issue comments (it already fetches them) to detect the agent-state marker — a new third resume case alongside the existing PR-based resume.
- **Triage gains a third resume path.** When survey finds an issue with an agent-state marker in its comments (and no linked agent PR), Triage returns `RESUME` pointing at the issue (not a PR) so the orchestrator can re-enter Explore with the prior dialogue.
- **Workspace moves to after Explore succeeds.** On `EXPLORED`, the orchestrator creates the Workspace and seeds the new PR description with the discovery output — skipping the blank-PR phase entirely.
- **Label management.** The `agent-investigating` label is added when Explore starts and removed when Workspace is created (the PR takes over as the visible record).
- `prompts/explore.md` is updated to reflect that `{{PR_CONTEXT}}` may now hold issue-comment dialogue (not just PR dialogue) and that blocking questions go to the issue on the first run.
- `SKILL.md` orchestration flow, stage descriptions, and state machine are updated to reflect the new ordering.

## Capabilities

### New Capabilities

- `explore-on-issue`: Running Explore against a bare issue before any Workspace/PR exists — including posting blocking questions as issue comments with an agent-state marker, and adding/removing an `agent-investigating` label.
- `pre-workspace-resume`: Detecting and resuming an in-progress Explore-on-issue run — survey reads issue comments for agent-state markers, triage surfaces the pre-Workspace resume case, and the orchestrator re-enters Explore with the prior dialogue as context.

### Modified Capabilities

<!-- No existing spec files to modify — this is the first spec-driven change set. -->

## Impact

- `skill/openspec-auto/SKILL.md` — orchestration flow reordered (Explore before Workspace), stage descriptions updated, state machine diagram updated, new resume case added to Triage and Workspace stages.
- `skill/openspec-auto/prompts/triage.md` — new `RESUME` case for pre-Workspace issues with agent-state in comments.
- `skill/openspec-auto/prompts/explore.md` — `{{PR_CONTEXT}}` renamed or clarified to cover both issue-comment dialogue (pre-Workspace) and PR dialogue (resume after Workspace).
- `skill/openspec-auto/scripts/survey.ts` — `buildTable` extended to check issue comments for the agent-state marker when `agentPr` is null.
- No new dependencies. No breaking change to the PR-based agent-state marker format.
