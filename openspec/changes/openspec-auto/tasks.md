## 1. Repository and Project Setup

- [x] 1.1 Create the `openspec-auto` GitHub repository (public, with README)
- [x] 1.2 Initialize `package.json` with name `openspec-auto`, version `0.1.0`, type `module`, scripts for `init` and TypeScript build
- [x] 1.3 Add TypeScript dev dependencies (`typescript`, `tsx`, `@types/node`) and configure `tsconfig.json`
- [x] 1.4 Create `.gitignore` with entries for `.openspec-auto.json`, `.openspec-auto/`, `node_modules`, `dist`
- [x] 1.5 Create the `skill/` directory structure for all five skill files

## 2. State Management

- [x] 2.1 Define `AgentState` TypeScript interface: `{ phase, issue, prNumber, branch, changeName, ciFixes, blocked }` with phase as a string-union enum type
- [x] 2.2 Create `scripts/write-state.ts`: writes `.openspec-auto/state.json`, validates phase enum, rejects unknown phases with non-zero exit
- [x] 2.3 Create `scripts/read-state.ts`: reads `.openspec-auto/state.json`, returns typed `AgentState`, throws if file is absent or invalid
- [x] 2.4 Create `scripts/sync-pr-state.ts`: reads `state.json`, renders the `## Agent Status` markdown table and `<!-- agent-state: {...} -->` comment, calls `gh pr edit` to update the PR description atomically
- [x] 2.5 Write tests for write-state (phase validation, round-trip), read-state (missing file error, invalid JSON), and sync-pr-state (rendered output matches state) using `node:test`

## 3. Config and Init Script

- [x] 3.1 Define `.openspec-auto.json` schema as a TypeScript interface (`{ reviewer: string }` plus index signature for future fields)
- [x] 3.2 Create `scripts/init.ts` with interactive prompts (using `@inquirer/prompts`)
- [x] 3.3 Implement GitHub reviewer inference: `gh repo view --json owner` → default reviewer value
- [x] 3.4 Implement `.gitignore` update: check if `.openspec-auto.json` already listed; if not, append and report
- [x] 3.5 Implement prerequisite check: warn if `gh` is not on PATH (skills are documented prerequisites; init does not probe the filesystem for them)
- [x] 3.6 Write `scripts/read-config.ts` shared helper: parse `.openspec-auto.json`, throw with init instructions if missing or invalid; also add `.openspec-auto/` to `.gitignore` if not present
- [x] 3.7 Write tests for config parsing, `.gitignore` update logic, and prerequisite check output

## 4. Sub-Agent Skill: Triage

- [x] 4.1 Create `skill/openspec-auto-triage/SKILL.md` with `<SUBAGENT-STOP>` guard and Mermaid flow diagram
- [x] 4.2 Write three-criteria eligibility check section (clarity, open questions, bounded scope)
- [x] 4.3 Write dedup check section (PR body match, remote branch match)
- [x] 4.4 Write selection scoring section (prefer high-impact, low-effort; bugs over vague features)
- [x] 4.5 Write output contract section: status `SELECTED` (include issue number, branch prefix, slug in prose) or `NO_ELIGIBLE`

## 5. Sub-Agent Skill: Explore

- [x] 5.1 Create `skill/openspec-auto-explore/SKILL.md` with `<SUBAGENT-STOP>` guard
- [x] 5.2 Write autonomous Q&A section: generate questions by issue type (bug vs feature), answer each from codebase
- [x] 5.3 Write blocking-question detection section: definition, examples (breaking change, API ambiguity), escalation signal via `## Blocking Questions` section
- [x] 5.4 Write output contract section: status `EXPLORED` (no blocking questions, proceed) or `NEEDS_INPUT` (blocking questions listed, orchestrator enters NEEDS_INPUT)
- [x] 5.5 Write investigation scope section: start from issue entry point, no full-repo crawl

## 6. Sub-Agent Skill: Implement

- [x] 6.1 Create `skill/openspec-auto-implement/SKILL.md` with `<SUBAGENT-STOP>` guard and Mermaid flow diagram
- [x] 6.2 Write TDD cycle section: invoke `superpowers:test-driven-development`, confirm failing test, write implementation, confirm passing
- [x] 6.3 Write per-task attempt cap section (3 failures → status `BLOCKED`, CI failures → status `CI_BLOCKED`; both include summary in prose)
- [x] 6.4 Write CI monitoring section: `gh pr checks --watch` after each push, CI fix cycle up to 3 attempts
- [x] 6.5 Write commit discipline section: conventional commits format, stage specific files (not `git add .`)
- [x] 6.6 Write task completion section: check off `tasks.md` item after tests pass, call `update-pr-state` for counter updates

## 7. Sub-Agent Skill: Review

- [x] 7.1 Create `skill/openspec-auto-review/SKILL.md` with `<SUBAGENT-STOP>` guard
- [x] 7.2 Write context isolation section: sub-agent derives all context from PR diff and description
- [x] 7.3 Write finding categorization section: in-scope/correct → implement; out-of-scope → log in PR comment; unclear → leave for human
- [x] 7.4 Write CI fix cycle section (resets to 0 at Phase 6 start, same 3-attempt cap as Phase 5)

## 8. Main Orchestrator Skill

- [x] 8.1 Create `skill/openspec-auto/SKILL.md` with `<SUBAGENT-STOP>` guard
- [x] 8.2 Add Mermaid state machine diagram covering all phases and transitions (including resume, NEEDS_INPUT, CI_BLOCKED paths)
- [x] 8.3 Write Phase 0 (Assess State): config check, read local `state.json` (primary path); if absent, scan GitHub PRs for agent-state markers (crash recovery), reconstruct state.json; resume or proceed to triage
- [x] 8.4 Write Phase 1 (Triage): invoke `openspec-auto-triage` sub-agent via `Agent` tool, parse result
- [x] 8.5 Write Phase 2 (Workspace Setup): `git checkout main && pull`, branch naming, `superpowers:using-git-worktrees`, empty commit, draft PR creation
- [x] 8.6 Write Phase 3 (Explore): invoke `openspec-auto-explore` sub-agent via `Agent` tool, branch on status: `EXPLORED` → proceed to Phase 4; `BLOCKED` → read blocking questions from prose, post to PR, enter NEEDS_INPUT
- [x] 8.7 Write Phase 4 (Propose): invoke `opsx:propose` via Skill tool, commit artifacts, spawn proposal-review Agent
- [x] 8.8 Write Phase 5 (Implement): invoke `openspec-auto-implement` sub-agent via `Agent` tool, handle CI_BLOCKED result
- [x] 8.9 Write Phase 6 (Review): reset `ciFixes`, `gh pr ready`, invoke `openspec-auto-review` sub-agent, handle CI_BLOCKED result
- [x] 8.10 Write Phase 7 (Wrap-up): update PR description, review/update OpenSpec artifacts, invoke `opsx:archive`, assign reviewer
- [x] 8.11 Write Phase 8 (Teardown): `ExitWorktree({ action: "keep" })`, `git checkout main && pull`, `ScheduleWakeup` or stop

## 9. README

- [x] 9.1 Write "What it does" paragraph: autonomous issue lifecycle, structured change management, OpenSpec artifact trail
- [x] 9.2 Write Prerequisites section: OpenSpec skills, superpowers skills, `gh` CLI, Node.js
- [x] 9.3 Write Install section: clone repo, `npm install`, `npx tsx scripts/init.ts`
- [x] 9.4 Write Usage section: `/loop /openspec-auto` with explanation of why slash command form is required
- [x] 9.5 Write Configuration section: what `.openspec-auto.json` contains, how to re-run init
- [x] 9.6 Write Limitations section: requires OpenSpec CLI and skills, one issue per iteration

## 10. Verification

- [x] 10.1 Run `npm test` — all script tests pass
- [x] 10.2 Run TypeScript compiler — no errors in `scripts/`
- [x] 10.3 Verify all five skill files have `<SUBAGENT-STOP>` guards
- [x] 10.4 Verify main skill's Mermaid diagram covers all phases and transition conditions
- [x] 10.5 Verify `write-state.ts` + `read-state.ts` round-trip: write state → read back → all fields match
- [x] 10.6 Verify `sync-pr-state.ts` produces valid PR description: rendered table and agent-state comment match state.json contents
