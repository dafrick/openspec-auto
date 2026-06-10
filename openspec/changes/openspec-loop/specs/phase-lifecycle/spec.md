## ADDED Requirements

### Requirement: Each invocation begins with state assessment
Every invocation of `openspec-auto` SHALL begin with Assess before any other work.

#### Scenario: Assess runs first on every invocation
- **WHEN** the orchestrator skill is invoked
- **THEN** it SHALL fetch all open PRs containing an `<!-- agent-state:` marker before taking any other action
- **THEN** it SHALL evaluate each found PR's state before proceeding to triage or resumption

---

### Requirement: Resumable PRs are resumed without re-running prior phases
If Assess finds a PR with `blocked: false` and an actionable phase, the loop SHALL resume from that phase. Because the worktree was torn down at the end of the previous run, the loop SHALL first re-establish the workspace (Workspace stage, resume mode) before running the resumed stage.

#### Scenario: Resume re-establishes the worktree first
- **WHEN** the loop resumes any in-progress phase
- **THEN** it SHALL go through Workspace in resume mode — fetch and check out the existing branch and enter its worktree
- **THEN** it SHALL NOT recreate the branch, PR, or `state.json`

#### Scenario: Resume from IMPLEMENT phase
- **WHEN** Assess finds a PR with `phase: "IMPLEMENT"` and `blocked: false`
- **THEN** the loop SHALL re-establish the workspace, then jump directly to Implement
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

### Requirement: The change name is decided after Explore and passed onward
The orchestrator SHALL derive the OpenSpec `changeName` once Explore succeeds, record it in `state.json`, and pass it to every later sub-agent so they all resolve `openspec/changes/<changeName>/`.

#### Scenario: changeName set on EXPLORED
- **WHEN** `explore` returns `**Status:** EXPLORED`
- **THEN** the orchestrator SHALL set `changeName` to the branch slug (keeping the change and branch paired) and write it to `state.json`
- **THEN** it SHALL pass `changeName` to the propose, proposal-review, implement, and code-review sub-agents

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

#### Scenario: Proposal review — blocking findings
- **WHEN** `proposal-review` returns `**Status:** CHANGES_REQUESTED` with blocking findings
- **THEN** the orchestrator SHALL rerun Propose with those findings as its change request, then re-review
- **THEN** after a third consecutive blocking round it SHALL post a PR comment for input and park (`NEEDS-INPUT`)

#### Scenario: Proposal review — only minor findings
- **WHEN** `proposal-review` returns only minor findings
- **THEN** the orchestrator SHALL post them as open questions and proceed to Implement

#### Scenario: Implement sub-agent — DONE
- **WHEN** `implement` returns `**Status:** DONE`
- **THEN** the orchestrator SHALL proceed to Code review

#### Scenario: Implement sub-agent — BLOCKED or CI_BLOCKED
- **WHEN** `implement` returns `**Status:** BLOCKED` or `**Status:** CI_BLOCKED`
- **THEN** the orchestrator SHALL update agent state accordingly and proceed to Teardown

#### Scenario: Code review — APPROVED
- **WHEN** `code-review` returns `**Status:** APPROVED`
- **THEN** the orchestrator SHALL proceed to Wrap up

#### Scenario: Code review — blocking findings
- **WHEN** `code-review` returns `**Status:** CHANGES_REQUESTED` with blocking findings
- **THEN** the orchestrator SHALL rerun Implement with those findings as its change request (resetting `ciFixes`), then re-review
- **THEN** after a third consecutive blocking round it SHALL post a PR comment for input and park (`NEEDS-INPUT`)

#### Scenario: Code review — only minor findings
- **WHEN** `code-review` returns only minor, out-of-scope, or unclear findings
- **THEN** the orchestrator SHALL post them as open questions and proceed to Wrap up

#### Scenario: Sub-agent returns no recognizable status
- **WHEN** a sub-agent exits without a recognizable `**Status:**` line
- **THEN** the orchestrator SHALL treat the phase as failed and proceed to Teardown
