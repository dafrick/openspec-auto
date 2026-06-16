## ADDED Requirements

### Requirement: survey.ts detects pre-Workspace agent state in issue comments
When building the survey table, for any issue where `agentPr` is null, `buildTable` SHALL scan that issue's comments for an `<!-- agent-state: … -->` marker. If found, it SHALL parse it and expose it in the `SurveyRow` as a new `agentIssueState` field.

#### Scenario: Issue comment with agent-state marker surfaced
- **WHEN** an issue has no linked agent PR but has a comment containing `<!-- agent-state: { "phase": "NEEDS_INPUT", "blocked": true, "issue": N } -->`
- **THEN** the `SurveyRow` for that issue SHALL have `agentIssueState: { phase: "NEEDS_INPUT", blocked: true }` and `agentPr: null`

#### Scenario: agentPr takes precedence over agentIssueState
- **WHEN** an issue has both a linked agent PR and a comment with an agent-state marker
- **THEN** `agentPr` SHALL be populated and `agentIssueState` SHALL be null (the PR is the authoritative record)

#### Scenario: No marker means agentIssueState is null
- **WHEN** an issue has no linked agent PR and no comment contains an agent-state marker
- **THEN** `agentIssueState` SHALL be null and the issue is treated as a fresh work candidate

### Requirement: Triage surfaces pre-Workspace issues as RESUME
When the survey table contains a row where `agentPr` is null but `agentIssueState` has `phase: "NEEDS_INPUT"` and `blocked: true`, and an issue comment from a non-agent author exists that is newer than the agent's blocking-questions comment, Triage SHALL return `RESUME` for that issue with `Target: issue #N` in the output.

#### Scenario: Human reply detected for pre-Workspace issue
- **WHEN** an issue's `agentIssueState` has `phase: "NEEDS_INPUT"` and `blocked: true`
- **AND** at least one issue comment from a non-agent author is newer than the agent's blocking-questions comment
- **THEN** Triage SHALL return `**Status:** RESUME` with `Target: issue #N`

#### Scenario: No human reply means issue is not resumable
- **WHEN** an issue's `agentIssueState` has `phase: "NEEDS_INPUT"` and `blocked: true`
- **AND** no issue comment from a non-agent author is newer than the agent's blocking-questions comment
- **THEN** Triage SHALL NOT select this issue and SHALL continue checking other rows

#### Scenario: Pre-Workspace RESUME takes precedence over new issue selection
- **WHEN** a pre-Workspace issue is resumable (human has replied)
- **THEN** Triage SHALL return `RESUME` for it rather than `SELECTED` for a new issue, consistent with the existing "resume first" policy

### Requirement: Orchestrator re-enters Explore-on-issue on pre-Workspace RESUME
When Triage returns `RESUME` with `Target: issue #N` (no PR number), the orchestrator SHALL dispatch Explore again with the issue body, the original blocking-questions comment, and the human's reply as `{{PRIOR_CONTEXT}}` — without creating a Workspace first.

#### Scenario: Explore re-dispatched with prior context on resume
- **WHEN** Triage returns `RESUME` targeting an issue (not a PR)
- **THEN** the orchestrator SHALL dispatch Explore with `{{PRIOR_CONTEXT}}` populated with the prior discovery output and the issue comment dialogue (blocking questions + human answers)
- **THEN** the orchestrator SHALL NOT run `setup-workspace.ts` before the Explore re-dispatch

#### Scenario: EXPLORED on resume triggers Workspace creation
- **WHEN** the resumed Explore-on-issue returns `EXPLORED`
- **THEN** the orchestrator SHALL proceed to Workspace creation, seeding the PR description with the new discovery output, exactly as for a first-run EXPLORED

#### Scenario: NEEDS_INPUT on resume posts updated questions to issue
- **WHEN** the resumed Explore-on-issue returns `NEEDS_INPUT` again
- **THEN** the orchestrator SHALL post a new issue comment with the updated blocking questions and an updated `<!-- agent-state: … -->` marker

### Requirement: SKILL.md orchestration reflects the new stage order
The SKILL.md flow diagram, stage descriptions, and Handling Sub-Agent Status table SHALL reflect the new ordering: Triage → Explore (on issue) → Workspace → Propose → … The Workspace stage description SHALL document both paths: fresh (after Explore-on-issue EXPLORED) and resume (existing PR-based).

#### Scenario: Flow diagram updated
- **WHEN** the SKILL.md flowchart is rendered
- **THEN** it SHALL show Explore between Triage's SELECTED output and the Workspace node

#### Scenario: Handling table updated
- **WHEN** Triage returns RESUME with Target: issue
- **THEN** the Handling Sub-Agent Status table SHALL specify the action as: re-enter Explore-on-issue with prior dialogue as {{PRIOR_CONTEXT}}
