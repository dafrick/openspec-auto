## ADDED Requirements

### Requirement: Triage surveys via a one-shot script, ordered by recency
The triage sub-agent SHALL obtain its table from the `survey.ts` script, which returns open issues (most-recently-updated first), each joined to its associated **open** agent PR and that PR's agent-state. The join uses GitHub's linked-PR graph (the PRs whose body closes the issue with a `Closes #N` keyword) and excludes closed PRs, so an abandoned (closed) attempt drops out and its issue becomes fresh work again. Comment threads (issue and PR) are paginated to completion so no resume signal or context is silently truncated. Triage does not fetch or join lists itself.

#### Scenario: Survey returns the joined table
- **WHEN** triage runs `survey.ts`
- **THEN** it SHALL receive rows of `{ issue, title, body, updatedAt, labels, comments, agentPr }` ordered most-recently-updated first
- **THEN** `agentPr` SHALL carry the linked open agent PR's number, phase, blocked, and comments, or be null
- **THEN** comment threads longer than one page SHALL be fully paginated

#### Scenario: Closed agent PR drops out of the survey
- **WHEN** an issue's only agent PR has been closed
- **THEN** the survey SHALL omit that PR, so the issue's `agentPr` is null and it is eligible as fresh work

---

### Requirement: Resumable work comes first, most advanced wins
The triage sub-agent SHALL prefer resuming in-flight work over starting a new issue. A PR is resumable when its agent-state shows an answered `NEEDS_INPUT` (a human comment newer than the blocking-questions comment) or a non-terminal phase with `blocked: false`. `CI_BLOCKED` and `IN_REVIEW` are not resumable: `CI_BLOCKED` is owned by a human, and `IN_REVIEW` is terminal — the agent does not respond to review, so it is left for the human to merge (or to close, which abandons it).

#### Scenario: Resumable row takes precedence
- **WHEN** any table row has a resumable agent PR
- **THEN** the triage sub-agent SHALL return `**Status:** RESUME` and SHALL NOT select a new issue

#### Scenario: Most advanced is resumed
- **WHEN** more than one row is resumable
- **THEN** the triage sub-agent SHALL resume the one furthest along (`CODE_REVIEW` > `IMPLEMENT` > `PROPOSAL_REVIEW` > `PROPOSE` > `EXPLORE` > `WORKSPACE`)

#### Scenario: No resumable row — consider new issues
- **WHEN** no row is resumable
- **THEN** the triage sub-agent SHALL evaluate the rows with no agent PR for selection

---

### Requirement: Issue must pass all three eligibility criteria
The triage sub-agent SHALL evaluate every open issue against three criteria. An issue must pass all three to be eligible.

#### Scenario: Issue passes all three criteria
- **WHEN** an issue has a clear problem description, no unanswered clarification requests, and bounded scope
- **THEN** the triage sub-agent SHALL mark it as eligible

#### Scenario: Issue fails the clarity criterion
- **WHEN** an issue body lacks reproduction steps (for bugs) or a description of desired behavior (for features)
- **THEN** the triage sub-agent SHALL mark it ineligible regardless of the other criteria

#### Scenario: Issue fails the open-question criterion
- **WHEN** an issue has a comment from the author or a maintainer posing an unanswered question
- **THEN** the triage sub-agent SHALL mark it ineligible

#### Scenario: Issue fails the scope criterion
- **WHEN** an issue would require major architectural decisions, cross-cutting rewrites, or new external dependencies needing architectural review
- **THEN** the triage sub-agent SHALL mark it ineligible

---

### Requirement: An issue with an associated agent PR is never newly selected
Dedup is a property of the table, not a separate step: an issue joined to an agent PR is resumed or skipped, never selected as new work. This prevents opening a second PR for an issue already in flight.

#### Scenario: Issue with an in-flight PR is not re-selected
- **WHEN** an issue's row has an associated agent PR that is not resumable (e.g. `CI_BLOCKED`, or `IN_REVIEW` awaiting merge)
- **THEN** the triage sub-agent SHALL NOT select that issue as new work

#### Scenario: Association is by the closing-keyword link
- **WHEN** an open PR's body closes the issue with a `Closes #N` keyword (GitHub's linked-PR graph) and carries an agent-state marker
- **THEN** the survey SHALL treat that PR as the issue's associated agent PR

---

### Requirement: Selection prefers high-impact, low-effort issues
From eligible issues, the triage sub-agent SHALL select the one with the highest impact and lowest estimated effort.

#### Scenario: Bug with reproduction steps preferred over vague feature
- **WHEN** both a bug with clear reproduction steps and a feature with vague requirements are eligible
- **THEN** the triage sub-agent SHALL prefer the bug

#### Scenario: No eligible issues found
- **WHEN** all open issues are ineligible or have active PRs/branches
- **THEN** the triage sub-agent SHALL return `NO_ELIGIBLE`
- **THEN** the orchestrator SHALL Teardown and schedule a 6-hour (idle) wakeup

---

### Requirement: Triage sub-agent returns a structured result
The triage sub-agent SHALL return one of: `RESUME` (PR number + recorded phase), `SELECTED` (issue number, branch type prefix `fix`/`feat`, and a 3–5 word kebab-case slug from the title), `NO_ELIGIBLE`, or `NEEDS_CONTEXT`.

#### Scenario: SELECTED includes branch-ready fields
- **WHEN** the triage sub-agent selects a new issue
- **THEN** its output SHALL include: issue number, branch type prefix (`fix` or `feat`), and a 3–5 word kebab-case slug from the issue title

#### Scenario: RESUME identifies the PR and phase
- **WHEN** the triage sub-agent resumes an in-flight PR
- **THEN** its output SHALL include the PR number and the recorded phase
