## ADDED Requirements

### Requirement: Implementation follows test-driven development
The `implement` sub-agent SHALL write failing tests before writing implementation code for each task.

#### Scenario: Test written before implementation
- **WHEN** the implement sub-agent begins a task
- **THEN** it SHALL invoke `superpowers:test-driven-development` to write a failing test
- **THEN** it SHALL write implementation code only after the test exists and is confirmed failing

#### Scenario: Task marked complete only when tests pass
- **WHEN** the implement sub-agent attempts to check off a task
- **THEN** it SHALL run the test suite and confirm the relevant tests pass before marking the task done

---

### Requirement: Per-task attempt cap prevents infinite loops
If a single task fails to reach passing local tests after 3 attempts, the sub-agent SHALL stop.

#### Scenario: Task exhausts attempt cap
- **WHEN** the implement sub-agent has attempted a task 3 times without getting tests to pass
- **THEN** it SHALL return `**Status:** BLOCKED` with a summary of the task and each attempt
- **THEN** the orchestrator SHALL write the blocked state and post the summary (the sub-agent does not write the PR)

---

### Requirement: CI is monitored after every push
After each `git push`, the implement sub-agent SHALL wait for all CI checks to complete before continuing.

#### Scenario: CI passes after push
- **WHEN** all CI checks complete with a passing status
- **THEN** the sub-agent SHALL continue to the next task

#### Scenario: CI fails after push
- **WHEN** any CI check fails
- **THEN** the sub-agent SHALL inspect the failure output, apply a targeted fix, commit, and push again

---

### Requirement: CI fix attempts are capped per increment
The `ciFixes` counter tracks CI fix attempts for the current Implement increment. The orchestrator resets it to 0 before each Implement run; when it reaches 3, the sub-agent SHALL stop.

#### Scenario: Third CI failure triggers stop
- **WHEN** the `ciFixes` counter reaches 3 within an Implement increment
- **THEN** the sub-agent SHALL return `**Status:** CI_BLOCKED` with a summary of all failures and attempts
- **THEN** the orchestrator SHALL write the `CI-BLOCKED` + `blocked: true` state and post the summary

#### Scenario: Counter resets each increment
- **WHEN** the orchestrator reruns Implement (e.g., to apply code-review's blocking findings)
- **THEN** it SHALL reset `ciFixes` to 0 before dispatching, giving the increment its own 3-attempt budget

---

### Requirement: Commits follow conventional commits format
Every commit made during implementation SHALL follow the conventional commits specification.

#### Scenario: Feature commit format
- **WHEN** the sub-agent commits work adding a new capability
- **THEN** the commit message SHALL follow the format: `feat(<scope>): <description>`

#### Scenario: Fix commit format
- **WHEN** the sub-agent commits a bug fix
- **THEN** the commit message SHALL follow the format: `fix(<scope>): <description>`

---

### Requirement: Implementation is driven by the OpenSpec task list
The sub-agent SHALL implement tasks in the order specified in `tasks.md` and check off each task upon completion.

#### Scenario: All tasks completed
- **WHEN** all tasks in `tasks.md` are checked off and CI passes
- **THEN** the sub-agent SHALL exit with a success signal for the orchestrator

---

### Requirement: Implement is rerunnable with a change request
The implement sub-agent SHALL accept an optional change request and, when present, address it rather than re-running the full task list.

#### Scenario: Rerun applies code-review's blocking findings
- **WHEN** the orchestrator reruns Implement with code-review's blocking findings as the change request
- **THEN** the sub-agent SHALL fix those findings (updating `tasks.md` or the change specs if warranted)
- **THEN** it SHALL not restart the completed task list from scratch
