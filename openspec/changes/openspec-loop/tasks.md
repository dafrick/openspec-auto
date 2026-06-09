## 1. Repository and Project Setup

- [ ] 1.1 Create the `openspec-loop` GitHub repository (public, with README)
- [ ] 1.2 Initialize `package.json` with name `openspec-loop`, version `0.1.0`, type `module`, scripts for `init` and TypeScript build
- [ ] 1.3 Add TypeScript dev dependencies (`typescript`, `tsx`, `@types/node`) and configure `tsconfig.json`
- [ ] 1.4 Create `.gitignore` with entries for `.openspec-loop.json`, `.openspec-loop/`, `node_modules`, `dist`
- [ ] 1.5 Create the `skill/` directory structure for all five skill files

## 2. State Management

- [ ] 2.1 Define `AgentState` TypeScript interface: `{ phase, issue, prNumber, branch, changeName, ciFixes, blocked }` with phase as a string-union enum type
- [ ] 2.2 Create `scripts/write-state.ts`: writes `.openspec-loop/state.json`, validates phase enum, rejects unknown phases with non-zero exit
- [ ] 2.3 Create `scripts/read-state.ts`: reads `.openspec-loop/state.json`, returns typed `AgentState`, throws if file is absent or invalid
- [ ] 2.4 Create `scripts/sync-pr-state.ts`: reads `state.json`, renders the `## Agent Status` markdown table and `<!-- agent-state: {...} -->` comment, calls `gh pr edit` to update the PR description atomically
- [ ] 2.5 Write tests for write-state (phase validation, round-trip), read-state (missing file error, invalid JSON), and sync-pr-state (rendered output matches state) using `node:test`

## 3. Config and Init Script

- [ ] 3.1 Define `.openspec-loop.json` schema as a TypeScript interface (`{ reviewer: string }` plus index signature for future fields)
- [ ] 3.2 Create `scripts/init.ts` with interactive prompts (using `@inquirer/prompts`)
- [ ] 3.3 Implement GitHub reviewer inference: `gh repo view --json owner` → default reviewer value
- [ ] 3.4 Implement `.gitignore` update: check if `.openspec-loop.json` already listed; if not, append and report
- [ ] 3.5 Implement prerequisite checks: scan `~/.claude/skills/` for OpenSpec skills, check `gh` on PATH; warn on missing
- [ ] 3.6 Write `scripts/read-config.ts` shared helper: parse `.openspec-loop.json`, throw with init instructions if missing or invalid; also add `.openspec-loop/` to `.gitignore` if not present
- [ ] 3.7 Write tests for config parsing, `.gitignore` update logic, and prerequisite check output

## 4. Sub-Agent Skill: Triage

- [ ] 4.1 Create `skill/openspec-loop-triage/SKILL.md` with `<SUBAGENT-STOP>` guard and Mermaid flow diagram
- [ ] 4.2 Write three-criteria eligibility check section (clarity, open questions, bounded scope)
- [ ] 4.3 Write dedup check section (PR body match, remote branch match)
- [ ] 4.4 Write selection scoring section (prefer high-impact, low-effort; bugs over vague features)
- [ ] 4.5 Write output contract section: status `SELECTED` (include issue number, branch prefix, slug in prose) or `NO_ELIGIBLE`

## 5. Sub-Agent Skill: Explore

- [ ] 5.1 Create `skill/openspec-loop-explore/SKILL.md` with `<SUBAGENT-STOP>` guard
- [ ] 5.2 Write autonomous Q&A section: generate questions by issue type (bug vs feature), answer each from codebase
- [ ] 5.3 Write blocking-question detection section: definition, examples (breaking change, API ambiguity), escalation signal via `## Blocking Questions` section
- [ ] 5.4 Write output contract section: status `EXPLORED` (no blocking questions, proceed) or `EXPLORED_WITH_CONCERNS` (blocking questions listed in prose, orchestrator enters NEEDS-INPUT)
- [ ] 5.5 Write investigation scope section: start from issue entry point, no full-repo crawl

## 6. Sub-Agent Skill: Implement

- [ ] 6.1 Create `skill/openspec-loop-implement/SKILL.md` with `<SUBAGENT-STOP>` guard and Mermaid flow diagram
- [ ] 6.2 Write TDD cycle section: invoke `superpowers:test-driven-development`, confirm failing test, write implementation, confirm passing
- [ ] 6.3 Write per-task attempt cap section (3 failures → status `BLOCKED`, CI failures → status `CI_BLOCKED`; both include summary in prose)
- [ ] 6.4 Write CI monitoring section: `gh pr checks --watch` after each push, CI fix cycle up to 3 attempts
- [ ] 6.5 Write commit discipline section: conventional commits format, stage specific files (not `git add .`)
- [ ] 6.6 Write task completion section: check off `tasks.md` item after tests pass, call `update-pr-state` for counter updates

## 7. Sub-Agent Skill: Review

- [ ] 7.1 Create `skill/openspec-loop-review/SKILL.md` with `<SUBAGENT-STOP>` guard
- [ ] 7.2 Write context isolation section: sub-agent derives all context from PR diff and description
- [ ] 7.3 Write finding categorization section: in-scope/correct → implement; out-of-scope → log in PR comment; unclear → leave for human
- [ ] 7.4 Write CI fix cycle section (resets to 0 at Phase 6 start, same 3-attempt cap as Phase 5)

## 8. Main Orchestrator Skill

- [ ] 8.1 Create `skill/openspec-loop/SKILL.md` with `<SUBAGENT-STOP>` guard
- [ ] 8.2 Add Mermaid state machine diagram covering all phases and transitions (including resume, NEEDS-INPUT, CI-BLOCKED paths)
- [ ] 8.3 Write Phase 0 (Assess State): config check, read local `state.json` (primary path); if absent, scan GitHub PRs for agent-state markers (crash recovery), reconstruct state.json; resume or proceed to triage
- [ ] 8.4 Write Phase 1 (Triage): invoke `openspec-loop-triage` sub-agent via `Agent` tool, parse result
- [ ] 8.5 Write Phase 2 (Workspace Setup): `git checkout main && pull`, branch naming, `superpowers:using-git-worktrees`, empty commit, draft PR creation
- [ ] 8.6 Write Phase 3 (Explore): invoke `openspec-loop-explore` sub-agent via `Agent` tool, branch on status: `EXPLORED` → proceed to Phase 4; `BLOCKED` → read blocking questions from prose, post to PR, enter NEEDS-INPUT
- [ ] 8.7 Write Phase 4 (Propose): invoke `opsx:propose` via Skill tool, commit artifacts, spawn proposal-review Agent
- [ ] 8.8 Write Phase 5 (Implement): invoke `openspec-loop-implement` sub-agent via `Agent` tool, handle CI-BLOCKED result
- [ ] 8.9 Write Phase 6 (Review): reset `ciFixes`, `gh pr ready`, invoke `openspec-loop-review` sub-agent, handle CI-BLOCKED result
- [ ] 8.10 Write Phase 7 (Wrap-up): update PR description, review/update OpenSpec artifacts, invoke `opsx:archive`, assign reviewer
- [ ] 8.11 Write Phase 8 (Teardown): `ExitWorktree({ action: "keep" })`, `git checkout main && pull`, `ScheduleWakeup` or stop

## 9. README

- [ ] 9.1 Write "What it does" paragraph: autonomous issue lifecycle, structured change management, OpenSpec artifact trail
- [ ] 9.2 Write Prerequisites section: OpenSpec skills, superpowers skills, `gh` CLI, Node.js
- [ ] 9.3 Write Install section: clone repo, `npm install`, `npx tsx scripts/init.ts`
- [ ] 9.4 Write Usage section: `/loop /openspec-loop` with explanation of why slash command form is required
- [ ] 9.5 Write Configuration section: what `.openspec-loop.json` contains, how to re-run init
- [ ] 9.6 Write Limitations section: designed for Claude Code only, requires OpenSpec CLI, one issue per iteration

## 10. Verification

- [ ] 10.1 Run `npm test` — all script tests pass
- [ ] 10.2 Run TypeScript compiler — no errors in `scripts/`
- [ ] 10.3 Verify all five skill files have `<SUBAGENT-STOP>` guards
- [ ] 10.4 Verify main skill's Mermaid diagram covers all phases and transition conditions
- [ ] 10.5 Verify `write-state.ts` + `read-state.ts` round-trip: write state → read back → all fields match
- [ ] 10.6 Verify `sync-pr-state.ts` produces valid PR description: rendered table and agent-state comment match state.json contents
