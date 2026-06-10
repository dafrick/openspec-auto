## Why

Autonomous issue agents (Devin, OpenHands, Copilot Coding Agent) implement without structure: no formal proposal, no design doc, no task list, and no state tracking that survives a crash. `openspec-auto` brings the OpenSpec change management layer to autonomous issue resolution — every issue gets a proposal, design, and task list before a line of code is written, and the PR carries machine-parseable agent state so runs are resumable and human-reviewable at every phase.

## What Changes

- Single `openspec-auto` skill containing the orchestrator, sub-agent prompt files, and TypeScript tooling
- `openspec-auto` orchestrator (`SKILL.md`): manages the phase state machine and dispatches sub-agents
- Sub-agents as prompt files under `prompts/` (no separate skills): `triage` (eligibility + selection), `explore` (autonomous requirements gathering → discovery output), `propose` (delegates to `opsx:propose`, commits the artifacts), `implement` (delegates to `opsx:apply`, watches CI), `review` (delegates to `superpowers:requesting-code-review`, scope filter)
- `init` TypeScript script: sets up `.openspec-auto.json` config (infers reviewer from GitHub, user accepts or overrides)
- `write-state` / `read-state` helpers: manage `.openspec-auto/state.json` as the source of truth
- `sync-pr-state` / `write-discovery` helpers: keep the PR description current — status block on top, latest discovery output below
- `.openspec-auto.json`: git-ignored config file carrying repo-specific settings (reviewer handle, etc.)

## Capabilities

### New Capabilities

- `agent-state`: Machine-parseable agent state schema embedded in PR descriptions — phase values, field definitions, parsing contract, and update protocol
- `phase-lifecycle`: Main orchestrator phase state machine — phase transitions, resumption from crash, stopping conditions, and inter-phase data flow
- `issue-triage`: Eligibility criteria for autonomous issue selection — clarity, open question, scope, and dedup checks; scoring and selection logic
- `requirements-gathering`: Explore sub-agent behavior — autonomous Q&A protocol (pose questions, answer from codebase), output contract, and critical-question escalation
- `implementation`: Implement sub-agent behavior — TDD cycle, CI monitoring, per-task attempt cap, commit discipline
- `code-review`: Review sub-agent behavior — independent context, finding categories, acceptance rules, CI fix cycle
- `config-and-init`: Config file schema (`.openspec-auto.json`), git-ignore requirement, init script behavior (GitHub inference, user acceptance flow)

### Modified Capabilities

## Impact

- New repository; no existing code is modified
- Depends on: OpenSpec CLI (`openspec`), OpenSpec skills (`opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive`), superpowers skills (`superpowers:using-git-worktrees`, `superpowers:test-driven-development`, `superpowers:requesting-code-review`), `gh` CLI, Node.js/TypeScript runtime
- The `.openspec-auto.json` config file must be git-ignored in any project using this skill
