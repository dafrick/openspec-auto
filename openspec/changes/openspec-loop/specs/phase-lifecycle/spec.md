## ADDED Requirements

### Requirement: Each invocation begins with state assessment
Every invocation of `openspec-loop` SHALL begin with Phase 0 (Assess State) before any other work.

#### Scenario: Phase 0 runs first on every invocation
- **WHEN** the main loop skill is invoked
- **THEN** it SHALL fetch all open PRs containing an `<!-- agent-state:` marker before taking any other action
- **THEN** it SHALL evaluate each found PR's state before proceeding to triage or resumption

---

### Requirement: Resumable PRs are resumed without re-running prior phases
If Phase 0 finds a PR with `blocked: false` and an actionable phase, the loop SHALL resume from that phase.

#### Scenario: Resume from IMPLEMENT phase
- **WHEN** Phase 0 finds a PR with `phase: "IMPLEMENT"` and `blocked: false`
- **THEN** the loop SHALL jump directly to Phase 5 (Implement)
- **THEN** the loop SHALL NOT re-run Phases 1–4

#### Scenario: COMPLETE phase is skipped
- **WHEN** Phase 0 finds a PR with `phase: "COMPLETE"`
- **THEN** the loop SHALL skip that PR and treat it as if it were not present

#### Scenario: No resumable PR found
- **WHEN** Phase 0 finds no PRs with a resumable state
- **THEN** the loop SHALL proceed to Phase 1 (Triage)

---

### Requirement: Phase 8 (Teardown) always runs
Phase 8 SHALL execute regardless of whether the iteration completed successfully, entered NEEDS-INPUT, or entered CI-BLOCKED.

#### Scenario: Successful iteration teardown
- **WHEN** Phase 7 (Wrap-up) completes
- **THEN** Phase 8 SHALL run, exit the worktree, check out main, and pull latest

#### Scenario: NEEDS-INPUT teardown
- **WHEN** Phase 3 determines critical questions require human input
- **THEN** Phase 8 SHALL run before the loop schedules a wakeup or stops

#### Scenario: CI-BLOCKED teardown
- **WHEN** Phase 5 or Phase 6 exhausts CI fix attempts
- **THEN** Phase 8 SHALL run before the loop stops

---

### Requirement: Loop schedules next wakeup after teardown
After Phase 8 completes, the loop SHALL schedule the next wakeup using `ScheduleWakeup`.

#### Scenario: Active issue queue wakeup
- **WHEN** the iteration completed work (success, NEEDS-INPUT, or CI-BLOCKED)
- **THEN** the loop SHALL schedule a wakeup in 30 minutes

#### Scenario: No eligible issues wakeup
- **WHEN** Phase 1 found no eligible issues
- **THEN** the loop SHALL schedule a wakeup in 2 hours

---

### Requirement: Loop stops without wakeup under stopping conditions
The loop SHALL stop (no wakeup scheduled) when all issues are in-flight or ineligible, when `gh` authentication has expired, or when NEEDS-INPUT or CI-BLOCKED state is entered.

#### Scenario: All issues in-flight
- **WHEN** Phase 1 finds that every open issue either has an agent PR or is ineligible
- **THEN** the loop SHALL output a message explaining why it stopped and SHALL NOT call ScheduleWakeup

#### Scenario: Authentication failure
- **WHEN** any `gh` command exits with an authentication error
- **THEN** the loop SHALL output a diagnostic message and SHALL NOT call ScheduleWakeup

#### Scenario: NEEDS-INPUT stop
- **WHEN** the loop enters NEEDS-INPUT state (critical questions require human)
- **THEN** the loop SHALL output a message noting the PR number and questions, then stop without scheduling a wakeup

---

### Requirement: Main loop delegates phases to sub-agent skills
Phases 1 (Triage), 3 (Explore), 5 (Implement), and 6 (Review) SHALL be executed as sub-agents invoked via the `Agent` tool, each using their dedicated skill file.

#### Scenario: Triage sub-agent invoked
- **WHEN** Phase 1 begins
- **THEN** the main loop SHALL invoke the `openspec-loop-triage` skill via the `Agent` tool
- **THEN** the sub-agent SHALL return the selected issue number (or a signal that no eligible issue exists)
- **THEN** the main loop SHALL use the returned issue number for subsequent phases

#### Scenario: Sub-agent failure propagates
- **WHEN** a sub-agent exits without a valid result
- **THEN** the main loop SHALL treat the phase as failed and proceed to Phase 8 (Teardown)
