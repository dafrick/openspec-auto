## ADDED Requirements

### Requirement: Explore sub-agent conducts autonomous Q&A
The `openspec-loop-explore` sub-agent SHALL generate a set of relevant questions for the given issue and answer each question from codebase investigation — without waiting for human input.

#### Scenario: Bug issue exploration
- **WHEN** the explore sub-agent receives a bug issue
- **THEN** it SHALL generate questions covering: reproduction path, expected vs actual behavior, affected code areas, related edge cases, and any conflicting behaviors
- **THEN** it SHALL answer each question by reading relevant code, tests, and git history

#### Scenario: Feature issue exploration
- **WHEN** the explore sub-agent receives a feature request issue
- **THEN** it SHALL generate questions covering: user intent, affected public API, integration points, potential regressions, and scope boundaries
- **THEN** it SHALL answer each question from the codebase and issue context

---

### Requirement: Explore sub-agent reports status EXPLORED or BLOCKED
The sub-agent's output SHALL begin with a status line. Status `EXPLORED` means no blocking questions were found and implementation can proceed. Status `BLOCKED` means blocking questions are present and require human input.

#### Scenario: No blocking questions — EXPLORED
- **WHEN** the explore sub-agent completes without finding questions requiring human input
- **THEN** its output SHALL begin with `**Status:** EXPLORED`
- **THEN** the main loop SHALL proceed to Phase 4 (Propose)

#### Scenario: Blocking questions present — BLOCKED
- **WHEN** the explore sub-agent identifies one or more questions that require human input
- **THEN** its output SHALL begin with `**Status:** BLOCKED`
- **THEN** its output SHALL list the blocking questions in prose so the orchestrator can post them to the PR
- **THEN** the main loop SHALL enter NEEDS-INPUT state

---

### Requirement: The orchestrator branches on status code
The main loop SHALL read the explore sub-agent's status code to determine whether to proceed or enter NEEDS-INPUT.

#### Scenario: Orchestrator reads EXPLORED
- **WHEN** the explore sub-agent returns `**Status:** EXPLORED`
- **THEN** the main loop SHALL proceed to Phase 4 (Propose)

#### Scenario: Orchestrator reads BLOCKED
- **WHEN** the explore sub-agent returns `**Status:** BLOCKED`
- **THEN** the main loop SHALL read the blocking questions from the prose output
- **THEN** it SHALL post the questions to the PR under a `## Blocking Questions` heading and enter NEEDS-INPUT

---

### Requirement: A blocking question requires human input that cannot be inferred
A question is blocking if answering it would change the implementation approach, affect the public API, or require a decision only the maintainer can make. Implementation details with multiple valid approaches are NOT blocking — the sub-agent SHALL make a reasonable call and document it.

#### Scenario: Breaking change question is blocking
- **WHEN** the explore sub-agent determines a fix would change public API behavior
- **THEN** it SHALL list "Is this a breaking change?" as a blocking question

#### Scenario: Implementation style question is not blocking
- **WHEN** the explore sub-agent identifies multiple valid implementation approaches with equivalent outcomes
- **THEN** it SHALL make a reasonable call, document the choice, and NOT list it as a blocking question

---

### Requirement: Explore sub-agent scopes investigation to the issue
The sub-agent SHALL investigate files, modules, and history relevant to the issue — not perform a full repository crawl.

#### Scenario: Targeted investigation
- **WHEN** an issue references a specific function, command, or feature area
- **THEN** the sub-agent SHALL start investigation from that entry point and follow references outward
- **THEN** it SHALL not read unrelated parts of the codebase
