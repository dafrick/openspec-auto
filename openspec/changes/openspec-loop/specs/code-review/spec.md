## ADDED Requirements

### Requirement: Code review is stateless and judges the diff against the spec
The `code-review` sub-agent SHALL read the current PR diff and the change spec (`openspec/changes/<changeName>/`) and judge the diff against that spec — not against the original issue (issue↔spec fidelity was settled at proposal-review). It SHALL NOT commit, push, fix, watch CI, or write to the PR. Fixes are applied by a rerun of `implement`, not by the reviewer.

#### Scenario: Reviewer spawned with PR and change name only
- **WHEN** Code review begins
- **THEN** the orchestrator SHALL invoke the code-review sub-agent via the `Agent` tool with the PR number and change name (no issue ref)
- **THEN** the sub-agent SHALL judge the diff against the change spec

#### Scenario: Reviewer makes no changes
- **WHEN** the code-review sub-agent finishes
- **THEN** it SHALL have made no commits and written nothing to the PR
- **THEN** it SHALL return its findings for the orchestrator to act on

---

### Requirement: Findings are tagged by scope and severity
The code-review sub-agent SHALL tag each finding by scope (in-scope = within the change's spec/tasks, out-of-scope = beyond what the spec covers, or unclear = design-level) and by severity (blocking or minor).

#### Scenario: Blocking in-scope finding
- **WHEN** a finding is within the change's spec and the implementation is incorrect or incomplete without it
- **THEN** the sub-agent SHALL tag it blocking

#### Scenario: Minor finding
- **WHEN** a finding is a worthwhile improvement that is not required for correctness
- **THEN** the sub-agent SHALL tag it minor

---

### Requirement: The orchestrator assesses findings by severity
On `CHANGES_REQUESTED`, the orchestrator SHALL decide whether to rerun based on severity, so the loop does not spin on non-essential improvements.

#### Scenario: Blocking findings trigger a rerun
- **WHEN** code-review returns one or more blocking findings
- **THEN** the orchestrator SHALL rerun `implement` with the blocking findings as its change request
- **THEN** it SHALL reset `ciFixes` to 0 for that increment

#### Scenario: Only minor findings — proceed
- **WHEN** code-review returns only minor, out-of-scope, or unclear findings
- **THEN** the orchestrator SHALL post them to the PR as open questions
- **THEN** it SHALL proceed to Wrap up without rerunning

#### Scenario: Stuck after three blocking rounds
- **WHEN** code-review returns blocking findings for a third consecutive round
- **THEN** the orchestrator SHALL post a PR comment summarizing the unresolved findings and asking for input
- **THEN** it SHALL write `NEEDS-INPUT` + `blocked: true` and proceed to Teardown

---

### Requirement: Draft status is removed before code review
The PR SHALL be marked ready for review (draft removed) before the code-review sub-agent is spawned.

#### Scenario: PR marked ready
- **WHEN** Code review begins
- **THEN** the orchestrator SHALL call `gh pr ready <PR>` before invoking the sub-agent
