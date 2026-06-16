## ADDED Requirements

### Requirement: Explore runs before Workspace is created
After Triage returns `SELECTED`, the orchestrator SHALL dispatch the Explore sub-agent against the bare issue — without creating a branch, worktree, or draft PR first. The Workspace stage SHALL only be entered after Explore returns `EXPLORED`.

#### Scenario: Explore dispatched immediately after SELECTED
- **WHEN** Triage returns `SELECTED` for an issue
- **THEN** the orchestrator SHALL dispatch the Explore sub-agent with the issue body and comments, before running any Workspace setup

#### Scenario: Workspace created only after EXPLORED
- **WHEN** Explore returns `EXPLORED`
- **THEN** the orchestrator SHALL proceed to Workspace creation, seeding the new PR description with the discovery output

#### Scenario: No branch or PR created before Explore completes
- **WHEN** Triage returns `SELECTED` and before Explore returns its status
- **THEN** no branch, empty commit, or draft PR SHALL exist for this issue

### Requirement: Blocking questions are posted to the issue
When Explore returns `NEEDS_INPUT`, the orchestrator SHALL post the blocking questions as a comment on the issue (not a PR comment). The comment body SHALL contain an `<!-- agent-state: { "phase": "NEEDS_INPUT", "blocked": true, "issue": N } -->` marker for resume detection.

#### Scenario: NEEDS_INPUT posts to issue
- **WHEN** Explore returns `NEEDS_INPUT` before a Workspace exists
- **THEN** the orchestrator SHALL post the blocking questions as an issue comment
- **THEN** the comment SHALL include the `<!-- agent-state: … -->` marker with `phase: "NEEDS_INPUT"` and `blocked: true`

#### Scenario: No draft PR created on NEEDS_INPUT
- **WHEN** Explore returns `NEEDS_INPUT` before a Workspace exists
- **THEN** the orchestrator SHALL NOT create a branch, worktree, or draft PR

### Requirement: agent-investigating label added and removed
The orchestrator SHALL add an `agent-investigating` label to the issue when Explore begins, and remove it when Workspace is created (i.e., when the PR becomes the visible record).

#### Scenario: Label added at Explore start
- **WHEN** the orchestrator is about to dispatch Explore for a newly selected issue
- **THEN** the orchestrator SHALL add the `agent-investigating` label to the issue via `gh issue edit <N> --add-label agent-investigating`

#### Scenario: Label removed at Workspace creation
- **WHEN** the orchestrator creates the Workspace (branch + PR) after Explore returns `EXPLORED`
- **THEN** the orchestrator SHALL remove the `agent-investigating` label from the issue via `gh issue edit <N> --remove-label agent-investigating`

#### Scenario: Label created idempotently at Bring-up
- **WHEN** the Bring-up stage runs and the `agent-investigating` label does not exist in the repo
- **THEN** the orchestrator SHALL create it via `gh label create` before dispatching any sub-agents
- **WHEN** the label already exists
- **THEN** the create step SHALL be skipped without error

### Requirement: Discovery output seeded into PR description at Workspace creation
When Workspace is created after a successful Explore, the orchestrator SHALL write the discovery output into the new PR description immediately (using `write-discovery.ts`), rather than leaving the PR body as the default template.

#### Scenario: PR description contains discovery on creation
- **WHEN** `setup-workspace.ts` creates the draft PR after Explore returns `EXPLORED`
- **THEN** the orchestrator SHALL immediately call `write-discovery.ts` to overwrite the PR body with the discovery output
- **THEN** the resulting PR description SHALL contain the agent-state marker, the discovery output, and the `Closes #N` footer
