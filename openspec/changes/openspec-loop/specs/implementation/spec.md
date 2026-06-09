## ADDED Requirements

### Requirement: Implementation follows test-driven development
The `openspec-loop-implement` sub-agent SHALL write failing tests before writing implementation code for each task.

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
- **THEN** it SHALL post a PR comment describing the task, each attempt, and what was tried
- **THEN** it SHALL update agent state to `CI-BLOCKED` with `blocked: true`
- **THEN** it SHALL exit without further implementation work

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

### Requirement: CI fix attempts are capped per phase
The `ciFixes` counter in agent state tracks CI fix attempts for the current phase. When it reaches 3, the sub-agent SHALL stop.

#### Scenario: Third CI failure triggers stop
- **WHEN** the `ciFixes` counter reaches 3 within Phase 5
- **THEN** the sub-agent SHALL post a CI-blocked comment with a summary of all failures and attempts
- **THEN** it SHALL update agent state to `CI-BLOCKED` with `blocked: true`
- **THEN** it SHALL exit

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
- **THEN** the sub-agent SHALL exit with a success signal for the main loop
