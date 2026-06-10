## ADDED Requirements

### Requirement: Explore sub-agent investigates autonomously
The explore sub-agent SHALL generate the relevant questions for the given issue and answer each from codebase investigation — without waiting for human input.

#### Scenario: Bug issue exploration
- **WHEN** the explore sub-agent receives a bug issue
- **THEN** it SHALL cover: reproduction path, expected vs actual behavior, affected code areas, related edge cases, and **whether existing specs govern the behavior and what the desired behavior is**
- **THEN** it SHALL answer each from relevant code, tests, and git history

#### Scenario: Feature issue exploration
- **WHEN** the explore sub-agent receives a feature request issue
- **THEN** it SHALL cover: user intent, affected public API, integration points, potential regressions, scope boundaries, and **whether the change is minor (add-on / local refactor) or major (architectural rework)**
- **THEN** it SHALL answer each from the codebase and issue context

---

### Requirement: Explore produces a synthesized discovery output
The explore sub-agent SHALL return a synthesized **discovery output** — a structured write-up (Problem, Classification, Findings, Approach, Out of scope), not a transcript of questions and not a verbatim dump. The orchestrator SHALL write this output into the PR description.

#### Scenario: Discovery output is synthesized and persisted
- **WHEN** the explore sub-agent completes its investigation
- **THEN** its output SHALL be a structured synthesis of findings, not a raw question/answer log
- **THEN** the orchestrator SHALL write the discovery output into the PR description (status block on top, discovery below)

#### Scenario: Discovery feeds the proposal on success
- **WHEN** the explore sub-agent returns `**Status:** EXPLORED`
- **THEN** the orchestrator SHALL pass the discovery output inline to the Propose stage

---

### Requirement: Explore reports status EXPLORED or NEEDS_INPUT
The sub-agent's output SHALL begin with a status line. `EXPLORED` means no blocking questions were found and the run can proceed to Propose. `NEEDS_INPUT` means blocking questions are present and require human input.

#### Scenario: No blocking questions — EXPLORED
- **WHEN** the explore sub-agent completes without finding questions requiring human input
- **THEN** its output SHALL begin with `**Status:** EXPLORED`
- **THEN** the orchestrator SHALL proceed to the Propose stage

#### Scenario: Blocking questions present — NEEDS_INPUT
- **WHEN** the explore sub-agent identifies one or more questions that require human input
- **THEN** its output SHALL begin with `**Status:** NEEDS_INPUT`
- **THEN** its output SHALL end with a `## Blocking Questions` section listing them
- **THEN** the orchestrator SHALL post those questions as a PR comment and enter NEEDS-INPUT state

---

### Requirement: A NEEDS-INPUT issue resumes by re-running explore with PR context
When a parked NEEDS-INPUT PR has been answered, the orchestrator SHALL re-dispatch the explore sub-agent with the issue plus the PR description (prior discovery) and all PR comments (the dialogue).

#### Scenario: Resume after a human answers
- **WHEN** a NEEDS-INPUT PR has a human comment newer than the agent's blocking-questions comment
- **THEN** the orchestrator SHALL re-dispatch explore, passing the prior discovery and the dialogue as context
- **THEN** explore SHALL produce a fresh discovery output that overwrites the PR description
- **THEN** explore SHALL return `EXPLORED` (proceed) or `NEEDS_INPUT` again (ask further questions)

#### Scenario: Unanswered NEEDS-INPUT stays parked
- **WHEN** a NEEDS-INPUT PR has no human comment after the blocking-questions comment
- **THEN** the orchestrator SHALL leave it parked and look for other work

---

### Requirement: A blocking question requires human input that cannot be inferred
A question is blocking if answering it would change the implementation approach, affect the public API, or require a decision only the maintainer can make — including a feature that turns out to be **major** (architectural rework). Implementation details with multiple valid approaches are NOT blocking — the sub-agent SHALL make a reasonable call and record it under Approach.

#### Scenario: Breaking change question is blocking
- **WHEN** the explore sub-agent determines a fix would change public API behavior
- **THEN** it SHALL list "Is this a breaking change?" as a blocking question

#### Scenario: Major scope is blocking
- **WHEN** the explore sub-agent determines a feature requires architectural rework
- **THEN** it SHALL raise the scope as a blocking question rather than proceeding

#### Scenario: Implementation style question is not blocking
- **WHEN** the explore sub-agent identifies multiple valid approaches with equivalent outcomes
- **THEN** it SHALL make a reasonable call, record it, and NOT list it as a blocking question

---

### Requirement: Explore sub-agent scopes investigation to the issue
The sub-agent SHALL investigate files, modules, and history relevant to the issue — not perform a full repository crawl.

#### Scenario: Targeted investigation
- **WHEN** an issue references a specific function, command, or feature area
- **THEN** the sub-agent SHALL start from that entry point and follow references outward
- **THEN** it SHALL not read unrelated parts of the codebase
