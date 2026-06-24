# test-evidence-pr-comment Specification

## Purpose
Defines how the orchestrator extracts the `**Proof:**` block from the code-review sub-agent's output and posts it as a `## Test Evidence` PR comment during Wrap up, making verification evidence visible to human reviewers.

## Requirements

### Requirement: Orchestrator posts Test Evidence comment during Wrap up
During the Wrap up stage, the orchestrator SHALL extract the `**Proof:**` block from the code-review sub-agent's output and post it as a PR comment. The comment SHALL be titled `## Test Evidence`. This comment MUST be posted before requesting human review.

#### Scenario: Proof block present — comment posted
- **WHEN** the code-review sub-agent returned a `**Proof:**` block
- **THEN** the orchestrator posts a PR comment with heading `## Test Evidence` containing the proof block content

#### Scenario: Proof block absent — fallback comment posted
- **WHEN** the code-review sub-agent did not return a `**Proof:**` block
- **THEN** the orchestrator posts a PR comment with heading `## Test Evidence` and body `*(no proof block returned by code-review)*`

#### Scenario: Test Evidence comment precedes reviewer request
- **WHEN** the Wrap up stage runs
- **THEN** the `## Test Evidence` comment is posted before the orchestrator calls `gh pr edit --add-reviewer` or the REST reviewer endpoint

#### Scenario: Test Evidence visible in PR timeline
- **WHEN** a human reviewer opens the PR
- **THEN** they can see the `## Test Evidence` comment in the PR comment thread showing what was verified
