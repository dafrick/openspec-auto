## 1. openspec-auto-implement skill

- [x] 1.1 Replace the inline TDD + task loop with a single `opsx:apply` delegation call via the Skill tool
- [x] 1.2 Remove inline sections for: task iteration, test writing, commit discipline, task check-off
- [x] 1.3 Add CI monitoring section: `gh pr checks --watch` after each push, 3-attempt CI-BLOCKED cap
- [x] 1.4 Add Integration section listing: `opsx:apply`, `superpowers:test-driven-development` (used by opsx:apply)
- [x] 1.5 Verify output contract still covers: `DONE`, `BLOCKED`, `CI_BLOCKED`

## 2. openspec-auto-review skill

- [x] 2.1 Replace inline diff-reading and review mechanics with a delegation to `superpowers:requesting-code-review`
- [x] 2.2 Keep and tighten the finding categorization section: in-scope → implement, out-of-scope → PR comment, unclear → leave for human
- [x] 2.3 Add Integration section listing: `superpowers:requesting-code-review`
- [x] 2.4 Verify output contract still covers: `APPROVED`, `CHANGES_REQUESTED`, `CI_BLOCKED`

## 3. openspec-auto-triage skill

- [x] 3.1 Add `NEEDS_CONTEXT` status to the output contract section with handling for `gh` auth / rate-limit failures
- [x] 3.2 Add model selection hint: haiku
- [x] 3.3 Add Integration section (no delegated skills — triage is standalone; list `gh` CLI as dependency)

## 4. openspec-auto-explore skill

- [x] 4.1 Add model selection hint: sonnet
- [x] 4.2 Add Integration section (no delegated skills — explore is standalone)

## 5. openspec-auto orchestrator skill

- [x] 5.1 Add `model` parameter to triage Agent invocation (`haiku`)
- [x] 5.2 Add `model` parameter to explore Agent invocation (`sonnet`)
- [x] 5.3 Add `model` parameter to implement Agent invocation (`sonnet`)
- [x] 5.4 Add `model` parameter to review Agent invocation (`opus`)
- [x] 5.5 Add `NEEDS_CONTEXT` handling for triage result: stop without ScheduleWakeup
- [x] 5.6 Add `superpowers:finishing-a-development-branch` call to Phase 7 (Wrap-up), before `opsx:archive`
- [x] 5.7 Add Integration section listing all five delegated skill groups

## 6. Verification

- [x] 6.1 Confirm all five skill files contain `## Integration` sections
- [x] 6.2 Confirm `openspec-auto-implement` contains no inline task loop or TDD instructions
- [x] 6.3 Confirm `openspec-auto-review` contains no inline diff-reading instructions
- [x] 6.4 Confirm all four Agent invocations in the orchestrator have model parameters
- [x] 6.5 Confirm Phase 7 calls `superpowers:finishing-a-development-branch` before `opsx:archive`
