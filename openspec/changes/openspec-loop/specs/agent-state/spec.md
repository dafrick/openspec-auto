## ADDED Requirements

### Requirement: The PR marker is the cross-run record; state.json is a within-run cache
The durable, cross-run record of agent state SHALL be the PR's `<!-- agent-state: {...} -->` marker. `.openspec-auto/state.json` SHALL be a within-run cache only — created at Workspace, mirrored to the marker at every transition, and deleted at Teardown. The loop SHALL NOT rely on any local file surviving between runs.

#### Scenario: State file created on Workspace (fresh)
- **WHEN** the orchestrator sets up a fresh workspace
- **THEN** it SHALL create `.openspec-auto/state.json` with initial values: `phase: "WORKSPACE"`, `issue`, `prNumber`, `branch`, `changeName`, `ciFixes: 0`, `blocked: false`

#### Scenario: State mirrored to the PR marker on transition
- **WHEN** the orchestrator transitions to a new phase
- **THEN** it SHALL update `state.json` and sync the PR's agent-status block (and marker) to match, before doing the phase's work

#### Scenario: State file deleted at Teardown
- **WHEN** Teardown runs
- **THEN** it SHALL delete `.openspec-auto/`; the PR marker remains the record of where the run ended

#### Scenario: State file fields
- **WHEN** `.openspec-auto/state.json` is read
- **THEN** it SHALL be valid JSON containing: `phase` (string), `issue` (number), `prNumber` (number), `branch` (string), `changeName` (string), `ciFixes` (number), `blocked` (boolean)

---

### Requirement: In-flight work is discovered from open PRs, not local files
Bring-up SHALL read only configuration. Discovery of resumable in-flight work SHALL come from surveying open PRs' agent-state markers (Triage), never from a local state file.

#### Scenario: Bring-up reads no local state
- **WHEN** the loop starts
- **THEN** Bring-up SHALL read `.openspec-auto.json` (config) only
- **THEN** it SHALL NOT read `.openspec-auto/state.json`

#### Scenario: Resume reconstructs the cache from the PR marker
- **WHEN** Triage returns `RESUME` for an in-flight PR
- **THEN** Workspace SHALL reconstruct `state.json` from that PR's agent-state marker before continuing

#### Scenario: Leftover state.json is ignored
- **WHEN** a previous run crashed and left a stale `.openspec-auto/state.json`
- **THEN** the next run SHALL ignore it (Bring-up does not read it; Triage rebuilds from PR markers)

---

### Requirement: PR description carries the status block on top and the latest summary below
The PR description SHALL hold two regions: the agent-status block at the top (an `## Agent Status` table plus an `<!-- agent-state: {...} -->` marker, rendered from `state.json`) and the latest summary below it — the discovery output after Explore, replaced by a post-proposal summary once Propose completes. The description SHALL be overwritten as the run progresses — it always reflects the current understanding, never an accreting log.

#### Scenario: Status block synced at each phase transition
- **WHEN** the orchestrator updates `state.json` to a new phase
- **THEN** it SHALL call `sync-pr-state` to update the `## Agent Status` block in place at the top of the description
- **THEN** the block SHALL match the current `state.json` contents, leaving the summary below untouched

#### Scenario: Discovery written below the status block
- **WHEN** the explore sub-agent returns a discovery output
- **THEN** the orchestrator SHALL call `write-discovery` to set the description to the status block followed by the discovery output

#### Scenario: Proposal summary replaces the discovery
- **WHEN** the propose sub-agent returns `PROPOSED` with a summary
- **THEN** the orchestrator SHALL call `write-discovery` to overwrite the lower region with the proposal summary

#### Scenario: sync-pr-state is idempotent
- **WHEN** `sync-pr-state` is called with the same state.json contents twice
- **THEN** the PR description SHALL be identical after both calls

---

### Requirement: Only the orchestrator writes the PR
The PR description and comments SHALL be written only by the orchestrator. Sub-agents SHALL return their output and the orchestrator SHALL persist it; sub-agents SHALL NOT edit the description or post comments. (Committing and pushing branch contents is not a PR write and remains a sub-agent's responsibility where stated.)

#### Scenario: Sub-agent returns data, orchestrator writes
- **WHEN** any sub-agent produces content destined for the PR (discovery, proposal summary, blocking questions, deferred findings, a CI-blocked summary)
- **THEN** it SHALL return that content in its output
- **THEN** the orchestrator SHALL write it to the PR description or post it as a comment

#### Scenario: PR comments hold the dialogue
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
- **THEN** it SHALL be one of: `WORKSPACE`, `EXPLORE`, `NEEDS-INPUT`, `PROPOSE`, `IMPLEMENT`, `REVIEW`, `IN-REVIEW`, `CI-BLOCKED`

---

### Requirement: Resumption depends on phase and human input
Whether the orchestrator resumes an existing issue depends on the PR's phase. A `CI-BLOCKED` issue is human-owned and never auto-resumes. A `NEEDS-INPUT` issue resumes once the human has answered its blocking questions. An `IN-REVIEW` issue resumes only when the human's review requests changes; otherwise it awaits the human's merge.

#### Scenario: CI-BLOCKED is not resumed
- **WHEN** Triage sees a PR marker with `blocked: true` and phase `CI-BLOCKED`
- **THEN** it SHALL NOT mark the PR resumable
- **THEN** it SHALL look for other work

#### Scenario: IN-REVIEW with requested changes is resumed
- **WHEN** Triage finds an `IN-REVIEW` PR with `reviewDecision: CHANGES_REQUESTED`
- **THEN** it SHALL return `RESUME`, and the orchestrator SHALL continue at Implement with the requested changes

#### Scenario: IN-REVIEW awaiting merge stays parked
- **WHEN** Triage finds an `IN-REVIEW` PR with no requested changes
- **THEN** it SHALL leave it for the human to merge and look for other work

#### Scenario: Answered NEEDS-INPUT is resumed
- **WHEN** Triage finds a `NEEDS-INPUT` PR with a human comment newer than the agent's blocking-questions comment
- **THEN** it SHALL return `RESUME`, and the orchestrator SHALL continue at the Explore stage with the PR context

#### Scenario: Unanswered NEEDS-INPUT stays parked
- **WHEN** Triage finds a `NEEDS-INPUT` PR with no newer human comment
- **THEN** it SHALL leave it parked and look for other work

#### Scenario: Non-blocked resumable state
- **WHEN** Triage sees a PR marker with `blocked: false` and an actionable phase
- **THEN** the orchestrator SHALL resume from the indicated phase
