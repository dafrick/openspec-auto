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

### Requirement: Explore sub-agent output ends with a Blocking Questions section
The sub-agent's output SHALL end with a `## Blocking Questions` section. This section lists any questions that cannot be resolved from the codebase and require human input before implementation can proceed. If there are none, the section SHALL contain "(none)".

#### Scenario: No blocking questions
- **WHEN** the explore sub-agent completes without finding questions requiring human input
- **THEN** its output SHALL end with:
  ```
  ## Blocking Questions
  (none)
  ```

#### Scenario: Blocking questions present
- **WHEN** the explore sub-agent identifies one or more questions that require human input
- **THEN** its output SHALL end with a `## Blocking Questions` section listing each question
- **THEN** the main loop SHALL read this section and enter NEEDS-INPUT state

---

### Requirement: The orchestrator determines NEEDS-INPUT from the Blocking Questions section
The main loop SHALL read the explore sub-agent's output and determine whether to proceed or enter NEEDS-INPUT based on the content of the `## Blocking Questions` section.

#### Scenario: Orchestrator reads blocking questions
- **WHEN** the explore sub-agent's output is returned to the main loop
- **THEN** the main loop SHALL check whether `## Blocking Questions` contains content beyond "(none)"
- **THEN** if blocking questions exist, it SHALL enter NEEDS-INPUT and post the questions to the PR

#### Scenario: Orchestrator proceeds when no blocking questions
- **WHEN** `## Blocking Questions` contains only "(none)"
- **THEN** the main loop SHALL proceed to Phase 4 (Propose)

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
