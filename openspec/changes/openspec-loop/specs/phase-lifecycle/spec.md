## ADDED Requirements

### Requirement: Each invocation begins with state assessment
Every invocation of `openspec-auto` SHALL begin with Assess before any other work.

#### Scenario: Assess runs first on every invocation
- **WHEN** the orchestrator skill is invoked
- **THEN** it SHALL fetch all open PRs containing an `<!-- agent-state:` marker before taking any other action
- **THEN** it SHALL evaluate each found PR's state before proceeding to triage or resumption

---

### Requirement: Resumable PRs are resumed without re-running prior phases
If Assess finds a PR with `blocked: false` and an actionable phase, the loop SHALL resume from that phase.

#### Scenario: Resume from IMPLEMENT phase
- **WHEN** Assess finds a PR with `phase: "IMPLEMENT"` and `blocked: false`
- **THEN** the loop SHALL jump directly to Implement
- **THEN** the loop SHALL NOT re-run the earlier stages (Triage through Propose)

#### Scenario: COMPLETE phase is skipped
- **WHEN** Assess finds a PR with `phase: "COMPLETE"`
- **THEN** the loop SHALL skip that PR and treat it as if it were not present

#### Scenario: Answered NEEDS-INPUT resumes at Explore
- **WHEN** Assess finds a `NEEDS-INPUT` PR with a human comment newer than the agent's blocking-questions comment
- **THEN** the loop SHALL resume at the Explore phase, passing the PR description and comments as context
- **THEN** it SHALL NOT re-run Triage or Workspace

#### Scenario: No resumable PR found
- **WHEN** Assess finds no PRs with a resumable state
- **THEN** the loop SHALL proceed to Triage

---

### Requirement: Teardown always runs
Teardown SHALL execute regardless of whether the iteration completed successfully, entered NEEDS-INPUT, or entered CI-BLOCKED.

#### Scenario: Successful iteration teardown
- **WHEN** Wrap up completes
- **THEN** Teardown SHALL run, exit the worktree, check out main, and pull latest

#### Scenario: NEEDS-INPUT teardown
- **WHEN** Explore determines critical questions require human input
- **THEN** Teardown SHALL run before the loop schedules a wakeup or stops

#### Scenario: CI-BLOCKED teardown
- **WHEN** Implement or Review exhausts CI fix attempts
- **THEN** Teardown SHALL run before the loop stops

---

### Requirement: Loop schedules next wakeup after teardown
After Teardown completes, the loop SHALL schedule the next wakeup using `ScheduleWakeup`.

#### Scenario: Active issue queue wakeup
- **WHEN** the iteration completed work (success, NEEDS-INPUT, or CI-BLOCKED)
- **THEN** the loop SHALL schedule a wakeup in 30 minutes

#### Scenario: No eligible issues wakeup
- **WHEN** Triage found no eligible issues
- **THEN** the loop SHALL schedule a wakeup in 2 hours

---

### Requirement: Loop stops without wakeup under stopping conditions
The loop SHALL stop (no wakeup scheduled) when all issues are in-flight or ineligible, when `gh` authentication has expired, or when NEEDS-INPUT or CI-BLOCKED state is entered.

#### Scenario: All issues in-flight
- **WHEN** Triage finds that every open issue either has an agent PR or is ineligible
- **THEN** the loop SHALL output a message explaining why it stopped and SHALL NOT call ScheduleWakeup

#### Scenario: Authentication failure
- **WHEN** any `gh` command exits with an authentication error
- **THEN** the loop SHALL output a diagnostic message and SHALL NOT call ScheduleWakeup

#### Scenario: NEEDS-INPUT stop
- **WHEN** the loop enters NEEDS-INPUT state (critical questions require human)
- **THEN** the loop SHALL output a message noting the PR number and questions, then stop without scheduling a wakeup

---

### Requirement: Orchestrator delegates stages to sub-agents
The Triage, Explore, Propose, Implement, and Review stages SHALL be executed as sub-agents invoked via the `Agent` tool, each defined by its prompt file. After Propose, an independent `proposal-review` sub-agent SHALL judge the artifacts before Implement begins.

#### Scenario: Triage sub-agent — SELECTED
- **WHEN** Triage begins and `triage` returns `**Status:** SELECTED`
- **THEN** the orchestrator SHALL read the issue number, branch prefix, and slug from the prose
- **THEN** it SHALL proceed to Workspace with those values

#### Scenario: Triage sub-agent — NO_ELIGIBLE
- **WHEN** `triage` returns `**Status:** NO_ELIGIBLE`
- **THEN** the orchestrator SHALL proceed to Teardown and schedule a 2-hour wakeup

#### Scenario: Explore sub-agent — EXPLORED
- **WHEN** `explore` returns `**Status:** EXPLORED`
- **THEN** the orchestrator SHALL proceed to Propose

#### Scenario: Explore sub-agent — NEEDS_INPUT
- **WHEN** `explore` returns `**Status:** NEEDS_INPUT`
- **THEN** the orchestrator SHALL write the discovery output to the PR description
- **THEN** it SHALL post the blocking questions as a PR comment and enter NEEDS-INPUT state

#### Scenario: Propose sub-agent — PROPOSED
- **WHEN** `propose` returns `**Status:** PROPOSED`
- **THEN** the orchestrator SHALL record the change name from the prose
- **THEN** it SHALL proceed to Implement

#### Scenario: Propose sub-agent — BLOCKED
- **WHEN** `propose` returns `**Status:** BLOCKED`
- **THEN** the orchestrator SHALL set `blocked: true` and proceed to Teardown

#### Scenario: Proposal review — APPROVED
- **WHEN** `proposal-review` returns `**Status:** APPROVED`
- **THEN** the orchestrator SHALL proceed to Implement

#### Scenario: Proposal review — CHANGES_REQUESTED
- **WHEN** `proposal-review` returns `**Status:** CHANGES_REQUESTED`
- **THEN** the orchestrator SHALL re-dispatch Propose with the feedback and re-review
- **THEN** after a second round it SHALL proceed to Implement

#### Scenario: Implement sub-agent — DONE
- **WHEN** `implement` returns `**Status:** DONE`
- **THEN** the orchestrator SHALL proceed to Review

#### Scenario: Implement sub-agent — BLOCKED or CI_BLOCKED
- **WHEN** `implement` returns `**Status:** BLOCKED` or `**Status:** CI_BLOCKED`
- **THEN** the orchestrator SHALL update agent state accordingly and proceed to Teardown

#### Scenario: Review sub-agent — APPROVED
- **WHEN** `review` returns `**Status:** APPROVED`
- **THEN** the orchestrator SHALL proceed to Wrap up

#### Scenario: Review sub-agent — CHANGES_REQUESTED
- **WHEN** `review` returns `**Status:** CHANGES_REQUESTED`
- **THEN** the orchestrator SHALL read the findings from the prose and implement accepted changes

#### Scenario: Sub-agent returns no recognizable status
- **WHEN** a sub-agent exits without a recognizable `**Status:**` line
- **THEN** the orchestrator SHALL treat the phase as failed and proceed to Teardown
