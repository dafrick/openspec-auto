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

### Requirement: PR description is synced from state.json at each phase transition
The `sync-pr-state` script SHALL read `.openspec-auto/state.json` and update the PR description at every phase transition.

#### Scenario: PR description sync after phase update
- **WHEN** the main loop updates `state.json` to a new phase
- **THEN** it SHALL call `sync-pr-state` to write the updated state to the PR description
- **THEN** the PR description SHALL contain an `## Agent Status` table and an `<!-- agent-state: {...} -->` HTML comment that match the current `state.json` contents

#### Scenario: sync-pr-state is idempotent
- **WHEN** `sync-pr-state` is called with the same state.json contents twice
- **THEN** the PR description SHALL be identical after both calls

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

### Requirement: Blocked flag gates resumption
The `blocked` field in state.json gates whether the main loop will resume work on an existing issue.

#### Scenario: Blocked state skipped during Phase 0
- **WHEN** Phase 0 reads state.json and finds `blocked: true`
- **THEN** the main loop SHALL NOT resume the current issue
- **THEN** it SHALL proceed to Phase 1 (Triage) to find a new issue

#### Scenario: Non-blocked resumable state
- **WHEN** Phase 0 reads state.json and finds `blocked: false` with an actionable phase
- **THEN** the main loop SHALL resume from the indicated phase
