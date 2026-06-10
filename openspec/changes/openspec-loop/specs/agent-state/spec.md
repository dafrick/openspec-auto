## ADDED Requirements

### Requirement: Local state file is the source of truth
Agent state SHALL be stored in `.openspec-auto/state.json` at the worktree root. This file is the authoritative record of the current phase, issue, and counters. All state reads during an active run SHALL read from this file.

#### Scenario: State file created on Phase 2
- **WHEN** the main loop enters Phase 2 (Workspace Setup)
- **THEN** it SHALL create `.openspec-auto/state.json` with initial values: `phase: "WORKSPACE"`, `issue`, `prNumber`, `branch`, `changeName`, `ciFixes: 0`, `blocked: false`

#### Scenario: State file updated on phase transition
- **WHEN** the main loop transitions from one phase to the next
- **THEN** it SHALL update `.openspec-auto/state.json` with the new phase value before doing any work for that phase

#### Scenario: State file fields
- **WHEN** `.openspec-auto/state.json` is read
- **THEN** it SHALL be valid JSON containing: `phase` (string), `issue` (number), `prNumber` (number), `branch` (string), `changeName` (string), `ciFixes` (number), `blocked` (boolean)

---

### Requirement: Phase 0 reads local state first, falls back to GitHub scan
Phase 0 SHALL check for `.openspec-auto/state.json` before making any GitHub API calls.

#### Scenario: Local state file exists
- **WHEN** Phase 0 starts and `.openspec-auto/state.json` exists and is valid
- **THEN** the main loop SHALL use the local file as the current state
- **THEN** it SHALL NOT scan GitHub PRs for agent-state markers

#### Scenario: Local state file absent (crash recovery)
- **WHEN** Phase 0 starts and `.openspec-auto/state.json` does not exist
- **THEN** the main loop SHALL scan open GitHub PRs for `<!-- agent-state: {...} -->` markers
- **THEN** if a resumable PR is found, it SHALL reconstruct `state.json` from the PR body before resuming

#### Scenario: No local file and no resumable PR
- **WHEN** Phase 0 finds no local state file and no resumable agent PR on GitHub
- **THEN** the main loop SHALL proceed to Phase 1 (Triage)

---

### Requirement: PR description carries the status block on top and the discovery output below
The PR description SHALL hold two regions: the agent-status block at the top (an `## Agent Status` table plus an `<!-- agent-state: {...} -->` marker, rendered from `state.json`) and the latest discovery output below it. The description SHALL be overwritten as the run progresses — it always reflects the current state, never an accreting log.

#### Scenario: Status block synced at each phase transition
- **WHEN** the orchestrator updates `state.json` to a new phase
- **THEN** it SHALL call `sync-pr-state` to update the `## Agent Status` block in place at the top of the description
- **THEN** the block SHALL match the current `state.json` contents, leaving the discovery output below untouched

#### Scenario: Discovery written below the status block
- **WHEN** the explore sub-agent returns a discovery output
- **THEN** the orchestrator SHALL call `write-discovery` to set the description to the status block followed by the discovery output

#### Scenario: sync-pr-state is idempotent
- **WHEN** `sync-pr-state` is called with the same state.json contents twice
- **THEN** the PR description SHALL be identical after both calls

---

### Requirement: PR comments hold the dialogue
Blocking questions and the human's answers SHALL live in PR comments, not the description. The description is state; the comments are conversation.

#### Scenario: Blocking questions posted as a comment
- **WHEN** the explore sub-agent returns `NEEDS_INPUT`
- **THEN** the orchestrator SHALL post the blocking questions as a PR comment
- **THEN** it SHALL NOT place the dialogue in the PR description

---

### Requirement: Phase values are a closed enumeration
The `phase` field in state.json and the PR description SHALL only contain one of the defined phase values.

#### Scenario: Invalid phase value rejected
- **WHEN** any script or skill attempts to write an unknown phase value to state.json
- **THEN** the write SHALL fail with a descriptive error message
- **THEN** state.json SHALL retain its previous valid contents

#### Scenario: Valid phase values
- **WHEN** `phase` is read from state.json
- **THEN** it SHALL be one of: `WORKSPACE`, `EXPLORE`, `NEEDS-INPUT`, `PROPOSE`, `IMPLEMENT`, `REVIEW`, `COMPLETE`, `CI-BLOCKED`

---

### Requirement: Blocked flag gates resumption, with a NEEDS-INPUT exception
The `blocked` field gates whether the orchestrator resumes an existing issue. A `CI-BLOCKED` issue is human-owned and never auto-resumes. A `NEEDS-INPUT` issue is the one exception: it resumes once the human has answered its blocking questions.

#### Scenario: CI-BLOCKED is not resumed
- **WHEN** Assess reads `blocked: true` with phase `CI-BLOCKED`
- **THEN** the orchestrator SHALL NOT resume the issue
- **THEN** it SHALL look for other work (Triage)

#### Scenario: Answered NEEDS-INPUT is resumed
- **WHEN** Assess finds a `NEEDS-INPUT` PR with a human comment newer than the agent's blocking-questions comment
- **THEN** the orchestrator SHALL resume it at the Explore stage with the PR context

#### Scenario: Unanswered NEEDS-INPUT stays parked
- **WHEN** Assess finds a `NEEDS-INPUT` PR with no newer human comment
- **THEN** the orchestrator SHALL leave it parked and look for other work

#### Scenario: Non-blocked resumable state
- **WHEN** Assess reads `blocked: false` with an actionable phase
- **THEN** the orchestrator SHALL resume from the indicated phase
