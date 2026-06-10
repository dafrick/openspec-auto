## ADDED Requirements

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

### Requirement: Dedup check prevents duplicate in-flight work
Before selecting an issue, the triage sub-agent SHALL verify no existing open PR or branch already targets it.

#### Scenario: PR references issue
- **WHEN** an open PR's body matches `#<N>` followed by a non-digit (standard GitHub closing syntax)
- **THEN** the triage sub-agent SHALL skip that issue

#### Scenario: Branch exists for issue
- **WHEN** a remote branch matching `fix/<N>-*` or `feat/<N>-*` exists
- **THEN** the triage sub-agent SHALL skip that issue

---

### Requirement: Selection prefers high-impact, low-effort issues
From eligible issues, the triage sub-agent SHALL select the one with the highest impact and lowest estimated effort.

#### Scenario: Bug with reproduction steps preferred over vague feature
- **WHEN** both a bug with clear reproduction steps and a feature with vague requirements are eligible
- **THEN** the triage sub-agent SHALL prefer the bug

#### Scenario: No eligible issues found
- **WHEN** all open issues are ineligible or have active PRs/branches
- **THEN** the triage sub-agent SHALL return a signal indicating no eligible issue
- **THEN** the orchestrator SHALL stop and schedule a 2-hour wakeup

---

### Requirement: Triage sub-agent returns a structured result
The triage sub-agent SHALL return a structured result the orchestrator can parse: issue number, issue type (`bug` → `fix`, `enhancement` → `feat`), and a slug derived from the issue title.

#### Scenario: Result includes branch-ready fields
- **WHEN** the triage sub-agent selects an issue
- **THEN** its output SHALL include: issue number, branch type prefix (`fix` or `feat`), and a 3–5 word kebab-case slug from the issue title
