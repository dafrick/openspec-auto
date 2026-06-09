## Why

Autonomous issue agents (Devin, OpenHands, Copilot Coding Agent) implement without structure: no formal proposal, no design doc, no task list, and no state tracking that survives a crash. `openspec-loop` brings the OpenSpec change management layer to autonomous issue resolution — every issue gets a proposal, design, and task list before a line of code is written, and the PR carries machine-parseable agent state so runs are resumable and human-reviewable at every phase.

## What Changes

- New repository `openspec-loop` containing skill files and TypeScript tooling
- `openspec-loop` main orchestrator skill: manages the phase state machine, invokes sub-agent skills
- `openspec-loop-triage` sub-agent skill: evaluates open issues against eligibility criteria, returns best candidate
- `openspec-loop-explore` sub-agent skill: autonomous requirements gathering — poses and answers product/technical questions from the codebase
- `openspec-loop-implement` sub-agent skill: TDD implementation loop with CI monitoring and attempt caps
- `openspec-loop-review` sub-agent skill: independent code review with no prior context
- `init` TypeScript script: sets up `.openspec-loop.json` config (infers reviewer from GitHub, user accepts or overrides)
- `write-state` / `read-state` TypeScript helpers: manage `.openspec-loop/state.json` as the source of truth for agent state
- `sync-pr-state` TypeScript helper: reads `state.json` and syncs the human-visible agent status to the PR description
- `.openspec-loop.json`: git-ignored config file carrying repo-specific settings (reviewer handle, etc.)

## Capabilities

### New Capabilities

- `agent-state`: Machine-parseable agent state schema embedded in PR descriptions — phase values, field definitions, parsing contract, and update protocol
- `phase-lifecycle`: Main orchestrator phase state machine — phase transitions, resumption from crash, stopping conditions, and inter-phase data flow
- `issue-triage`: Eligibility criteria for autonomous issue selection — clarity, open question, scope, and dedup checks; scoring and selection logic
- `requirements-gathering`: Explore sub-agent behavior — autonomous Q&A protocol (pose questions, answer from codebase), output contract, and critical-question escalation
- `implementation`: Implement sub-agent behavior — TDD cycle, CI monitoring, per-task attempt cap, commit discipline
- `code-review`: Review sub-agent behavior — independent context, finding categories, acceptance rules, CI fix cycle
- `config-and-init`: Config file schema (`.openspec-loop.json`), git-ignore requirement, init script behavior (GitHub inference, user acceptance flow)

### Modified Capabilities

## Impact

- New repository; no existing code is modified
- Depends on: OpenSpec CLI (`openspec`), OpenSpec skills (`opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive`), superpowers skills (`superpowers:using-git-worktrees`, `superpowers:test-driven-development`, `superpowers:requesting-code-review`), `gh` CLI, Node.js/TypeScript runtime
- The `.openspec-loop.json` config file must be git-ignored in any project using this skill
