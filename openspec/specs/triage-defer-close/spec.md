# triage-defer-close Specification

## Purpose
Defines how the triage sub-agent emits a Deferred list for rejected issues and how the orchestrator processes that list by posting closing comments and closing each issue.

## Requirements

### Requirement: Triage emits a Deferred list for rejected issues
When the triage sub-agent rejects one or more issues (for any red flag — including `Out of scope (vision)`), it SHALL include a `Deferred:` block in its output listing each rejected issue number and the named red flag. The `Deferred:` block is additive: it MAY appear alongside any primary status (`SELECTED`, `NO_ELIGIBLE`, `RESUME`, or `NEEDS_CONTEXT`).

#### Scenario: One issue rejected alongside a selected issue
- **WHEN** triage selects issue #5 and rejects issue #3 as a confirmed duplicate
- **THEN** the output SHALL include both `**Status:** SELECTED` for #5 and a `Deferred:` block listing `#3: Confirmed duplicate — <observation>`

#### Scenario: All issues rejected, no selection
- **WHEN** all surveyed issues carry a directly observable red flag
- **THEN** the output SHALL be `**Status:** NO_ELIGIBLE` with a `Deferred:` block listing each rejected issue and its red flag

#### Scenario: No issues rejected
- **WHEN** no issue has a directly observable red flag
- **THEN** the output SHALL NOT include a `Deferred:` block

### Requirement: Orchestrator closes deferred issues with a reason comment
When the triage output contains a `Deferred:` block, the orchestrator SHALL, for each entry, post a closing comment on the issue and then call `gh issue close <N>`. The comment body SHALL be a single line that names the closing reason (e.g., "Closing as duplicate of #N", "Closing as out of scope", "Closing as out of scope — outside product vision").

#### Scenario: Closing a confirmed duplicate
- **WHEN** the deferred entry names `Confirmed duplicate` and references issue #8
- **THEN** the orchestrator SHALL post "Closing as duplicate of #8" and then run `gh issue close <N>`

#### Scenario: Closing an out-of-scope issue
- **WHEN** the deferred entry names `Out of scope` or `Out of scope (vision)`
- **THEN** the orchestrator SHALL post "Closing as out of scope" (appending the vision note when applicable) and then run `gh issue close <N>`

#### Scenario: Closing a no-observable-ask issue
- **WHEN** the deferred entry names `No observable ask`
- **THEN** the orchestrator SHALL post "Closing: no actionable ask found in the issue" and then run `gh issue close <N>`

#### Scenario: Deferred processing does not block primary routing
- **WHEN** the triage output contains both a `SELECTED` status and a `Deferred:` block
- **THEN** the orchestrator SHALL process the `Deferred:` block (post comments and close issues) before continuing to the `SELECTED` routing, and the primary routing SHALL proceed normally regardless of whether any `gh issue close` call fails
