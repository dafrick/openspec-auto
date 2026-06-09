## ADDED Requirements

### Requirement: Each skill file has an Integration section

Every openspec-auto skill file SHALL contain an `## Integration` section listing the superpowers and opsx skills it delegates to, and what the delegated skill does NOT cover that the openspec-auto skill adds.

#### Scenario: Integration section present in all skills
- **WHEN** any of the five skill files is read
- **THEN** it SHALL contain an `## Integration` section
- **THEN** that section SHALL list each delegated skill by name
- **THEN** that section SHALL note what the openspec-auto layer adds beyond the delegated skill

---

### Requirement: implement sub-agent delegates task loop to opsx:apply

The `openspec-auto-implement` skill SHALL invoke `opsx:apply` for the full TDD task loop. It SHALL NOT describe its own task iteration, TDD cycle, commit discipline, or task check-off logic.

#### Scenario: opsx:apply handles task loop
- **WHEN** the implement sub-agent begins work
- **THEN** it SHALL invoke `opsx:apply` via the Skill tool
- **THEN** it SHALL NOT contain inline instructions for reading tasks.md, writing tests, or committing

#### Scenario: CI monitoring is the implement skill's unique addition
- **WHEN** opsx:apply completes a task and pushes a commit
- **THEN** the implement sub-agent SHALL run `gh pr checks --watch` to wait for CI
- **THEN** on CI failure it SHALL apply a targeted fix and push again
- **THEN** after 3 CI failures it SHALL enter CI-BLOCKED and stop

---

### Requirement: review sub-agent delegates review mechanics to superpowers:requesting-code-review

The `openspec-auto-review` skill SHALL invoke `superpowers:requesting-code-review` for diff reading and finding identification. It SHALL NOT describe its own diff review or finding identification process.

#### Scenario: requesting-code-review handles review mechanics
- **WHEN** the review sub-agent begins
- **THEN** it SHALL invoke `superpowers:requesting-code-review`
- **THEN** it SHALL NOT contain inline instructions for reading the PR diff or identifying issues

#### Scenario: Finding categorization is the review skill's unique addition
- **WHEN** `superpowers:requesting-code-review` returns findings
- **THEN** the review sub-agent SHALL categorize each as: in-scope (implement it), out-of-scope (post PR comment), or unclear (leave for human)
- **THEN** in-scope findings SHALL be implemented before the skill exits

---

### Requirement: Main orchestrator specifies model per sub-agent invocation

Each `Agent` tool call in `openspec-auto/SKILL.md` SHALL include a model selection hint.

#### Scenario: Triage uses a fast model
- **WHEN** the orchestrator invokes the triage sub-agent
- **THEN** the invocation SHALL specify `model: "haiku"`

#### Scenario: Explore uses a standard model
- **WHEN** the orchestrator invokes the explore sub-agent
- **THEN** the invocation SHALL specify `model: "sonnet"`

#### Scenario: Implement uses a standard model
- **WHEN** the orchestrator invokes the implement sub-agent
- **THEN** the invocation SHALL specify `model: "sonnet"`

#### Scenario: Review uses the most capable model
- **WHEN** the orchestrator invokes the review sub-agent
- **THEN** the invocation SHALL specify `model: "opus"`

---

### Requirement: Triage sub-agent reports NEEDS_CONTEXT on infrastructure failure

The `openspec-auto-triage` skill SHALL return `**Status:** NEEDS_CONTEXT` when GitHub API calls fail due to authentication errors or rate limiting.

#### Scenario: gh auth failure during issue fetch
- **WHEN** `gh issue list` exits with an authentication error
- **THEN** the triage sub-agent SHALL output `**Status:** NEEDS_CONTEXT`
- **THEN** it SHALL describe the error in prose so the orchestrator can surface it

#### Scenario: Orchestrator stops on NEEDS_CONTEXT
- **WHEN** the triage sub-agent returns `**Status:** NEEDS_CONTEXT`
- **THEN** the main loop SHALL output a diagnostic message
- **THEN** it SHALL NOT call ScheduleWakeup

---

### Requirement: Phase 7 invokes superpowers:finishing-a-development-branch

The `openspec-auto/SKILL.md` Phase 7 (Wrap-up) SHALL invoke `superpowers:finishing-a-development-branch` before calling `opsx:archive`.

#### Scenario: finishing-a-development-branch runs in wrap-up
- **WHEN** Phase 7 begins
- **THEN** the orchestrator SHALL invoke `superpowers:finishing-a-development-branch` via the Skill tool
- **THEN** only after that skill completes SHALL it invoke `opsx:archive`
