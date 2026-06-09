## ADDED Requirements

### Requirement: Review sub-agent has no prior context
The `openspec-loop-review` sub-agent SHALL be spawned with only the PR number — no conversation history, no implementation context from the main loop.

#### Scenario: Review sub-agent spawned cleanly
- **WHEN** Phase 6 begins
- **THEN** the main loop SHALL invoke the review sub-agent via the `Agent` tool with only the PR number in the prompt
- **THEN** the sub-agent SHALL derive all context from the PR itself (description, diff, linked issue)

---

### Requirement: Findings are categorized by scope and correctness
The review sub-agent SHALL categorize each finding as: in-scope/correct, out-of-scope, or unclear.

#### Scenario: In-scope finding implemented
- **WHEN** the review sub-agent reports a finding that is correct and within the scope of the linked issue
- **THEN** the main loop SHALL implement it

#### Scenario: Out-of-scope finding logged
- **WHEN** the review sub-agent reports a finding that would change behavior beyond the linked issue's scope
- **THEN** the main loop SHALL skip the finding and post a PR comment noting it was considered but deferred

#### Scenario: Unclear finding escalated to human
- **WHEN** the review sub-agent reports a finding that would substantially change the design
- **THEN** the main loop SHALL leave it for the human reviewer and note it in the PR description

---

### Requirement: Draft status is removed before review
The PR SHALL be marked ready for review (draft removed) before the review sub-agent is spawned.

#### Scenario: PR marked ready
- **WHEN** Phase 6 begins
- **THEN** the main loop SHALL call `gh pr ready <PR>` before invoking the review sub-agent

---

### Requirement: CI fix counter resets at the start of Phase 6
The `ciFixes` counter in agent state SHALL be reset to 0 when Phase 6 begins, regardless of how many CI fixes occurred in Phase 5.

#### Scenario: Counter resets between phases
- **WHEN** Phase 6 starts
- **THEN** the `update-pr-state` helper SHALL write `ciFixes: 0` to agent state

#### Scenario: Phase 6 has its own 3-attempt CI budget
- **WHEN** CI fails after a review fix is pushed in Phase 6
- **THEN** the `ciFixes` counter SHALL increment from 0 (not continuing from Phase 5's count)
- **THEN** on reaching 3, the same CI-BLOCKED stop procedure as Phase 5 SHALL apply

---

### Requirement: Phase 6 CI-BLOCKED uses same stop procedure as Phase 5
When Phase 6 exhausts CI fix attempts, the loop SHALL enter the same CI-BLOCKED state as Phase 5.

#### Scenario: Phase 6 CI-BLOCKED
- **WHEN** `ciFixes` reaches 3 in Phase 6
- **THEN** the loop SHALL post a CI-blocked comment, set agent state to `CI-BLOCKED` with `blocked: true`, and proceed to Phase 8
