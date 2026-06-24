## ADDED Requirements

### Requirement: Explore sub-agent includes a Blocker reason code on NEEDS_INPUT
When the explore sub-agent returns `**Status:** NEEDS_INPUT`, its output SHALL include a `Blocker:` line naming one of the following reason codes: `no_repro`, `product_direction`, `missing_credentials`, `unclear_requirements`.

#### Scenario: Explore cannot reproduce the reported bug
- **WHEN** explore cannot find a reproduction path and the issue body lacks sufficient detail
- **THEN** the `NEEDS_INPUT` output SHALL include `Blocker: no_repro`

#### Scenario: Feature requires a product direction decision
- **WHEN** the feature touches public API or product scope in a way only the maintainer can decide
- **THEN** the `NEEDS_INPUT` output SHALL include `Blocker: product_direction`

#### Scenario: Required credentials or access are missing
- **WHEN** the investigation requires API keys, service credentials, or access not available to the agent
- **THEN** the `NEEDS_INPUT` output SHALL include `Blocker: missing_credentials`

#### Scenario: Requirements are too unclear to proceed
- **WHEN** the issue body is ambiguous in a way that makes multiple incompatible approaches plausible
- **THEN** the `NEEDS_INPUT` output SHALL include `Blocker: unclear_requirements`

### Requirement: Implement sub-agent includes a Blocker reason code on BLOCKED and CI_BLOCKED
When the implement sub-agent returns `**Status:** BLOCKED` or `**Status:** CI_BLOCKED`, its output SHALL include a `Blocker:` line naming one of the following reason codes: `no_repro`, `missing_credentials`, `first_time_ci_approval`, `test_failure`.

#### Scenario: Implement is blocked by a CI first-time approval gate
- **WHEN** `gh pr checks` shows checks are pending due to a first-time contributor approval requirement
- **THEN** the `CI_BLOCKED` output SHALL include `Blocker: first_time_ci_approval`

#### Scenario: Implement is blocked by a persistent test failure
- **WHEN** the implement sub-agent exhausts its CI fix cap against a failing test
- **THEN** the `CI_BLOCKED` output SHALL include `Blocker: test_failure`

#### Scenario: Implement cannot reproduce the issue locally
- **WHEN** the implement sub-agent cannot find or trigger the reported bug
- **THEN** the `BLOCKED` output SHALL include `Blocker: no_repro`

#### Scenario: Implement needs credentials unavailable to the agent
- **WHEN** the implementation requires secrets or service access the agent does not have
- **THEN** the `BLOCKED` output SHALL include `Blocker: missing_credentials`

### Requirement: Orchestrator includes Blocker reason code in parking PR comment
When the orchestrator parks an issue as `NEEDS_INPUT` or `CI_BLOCKED`, the PR comment it posts SHALL include a `Blocker: <code>` line. The code SHALL be taken verbatim from the sub-agent's output. If no `Blocker:` line is present in the sub-agent's output, the orchestrator SHALL omit the `Blocker:` line from the PR comment (graceful degradation).

#### Scenario: Parking comment includes the blocker code
- **WHEN** the explore sub-agent returns `NEEDS_INPUT` with `Blocker: product_direction`
- **THEN** the orchestrator's parking PR comment SHALL include the line `Blocker: product_direction`

#### Scenario: Missing blocker code does not crash the orchestrator
- **WHEN** a sub-agent returns `NEEDS_INPUT` without a `Blocker:` line
- **THEN** the orchestrator SHALL still post the parking comment, omitting only the `Blocker:` line
