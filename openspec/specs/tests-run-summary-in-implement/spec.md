# tests-run-summary-in-implement Specification

## Purpose
Defines how the implement sub-agent reports which tests it ran in its DONE output, and how the orchestrator captures that summary in the PR description.

## Requirements

### Requirement: Implement DONE output includes Tests run summary
The implement sub-agent's `DONE` output SHALL include a `**Tests run:**` line after the `Completed tasks:` line. The line MUST list the test commands that were executed during implementation (e.g., `npm test`, `npm run test:unit`, specific test file invocations). If no tests were run, the sub-agent SHALL state "none" with a brief explanation.

#### Scenario: DONE output includes Tests run line
- **WHEN** the implement sub-agent returns `**Status:** DONE`
- **THEN** the output contains a `**Tests run:**` line listing the test commands executed

#### Scenario: Tests run line appears before Summary section
- **WHEN** the implement sub-agent produces its DONE output
- **THEN** the `**Tests run:**` line appears between `Completed tasks:` and the `Summary:` section

#### Scenario: No tests available is stated explicitly
- **WHEN** the implement sub-agent ran no tests (e.g., no test infrastructure exists)
- **THEN** the `**Tests run:**` line reads "none" followed by a brief explanation

### Requirement: Orchestrator captures Tests run in implementation summary
The orchestrator SHALL include the `**Tests run:**` line from the implement sub-agent's `DONE` output when writing the implementation summary to the PR description via `write-discovery.ts`. The tests-run content MUST appear in the summary written to the PR description.

#### Scenario: Tests run included in PR description
- **WHEN** the implement sub-agent returns DONE with a `**Tests run:**` line
- **THEN** the orchestrator includes that line in the implementation summary written to the PR description

#### Scenario: Implementation summary in PR description contains test evidence
- **WHEN** a human reviewer opens the PR description
- **THEN** they can see which tests the implement sub-agent executed
