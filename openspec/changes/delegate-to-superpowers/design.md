## Context

The openspec-auto skill suite was built from scratch, describing all behavior inline. Post-implementation review against the superpowers skill library revealed significant overlap: `opsx:apply` already drives a TDD task loop with task-tracking; `superpowers:subagent-driven-development` handles per-task review cycles; `superpowers:requesting-code-review` provides review mechanics; `superpowers:finishing-a-development-branch` handles post-implementation wrap-up. The openspec-auto skills duplicate all of this.

The design goal is to reduce each skill to only the logic that is genuinely unique to the autonomous issue lifecycle — and replace everything else with a delegation call to the appropriate superpowers or opsx skill.

## Goals / Non-Goals

**Goals:**
- Each skill file is ≤ 60 lines of unique logic
- No skill describes mechanics already covered by a named superpowers or opsx skill
- All five skill files have an Integration section listing delegated skills
- Model selection guidance is present at every sub-agent invocation point

**Non-Goals:**
- Changing the phase state machine or the overall orchestration structure
- Modifying TypeScript scripts
- Renaming skills or changing install paths

## Decisions

### D1: implement sub-agent delegates task loop entirely to `opsx:apply`

**Decision**: `openspec-auto-implement` invokes `opsx:apply` for the full task loop (TDD per task, check-off, commit discipline). Its only unique contribution is: post-push CI monitoring (`gh pr checks --watch`) and the CI-BLOCKED stop procedure.

**Rationale**: `opsx:apply` already handles reading `tasks.md`, invoking `superpowers:test-driven-development`, committing, and tracking progress. Duplicating this in the implement skill creates drift risk — if opsx:apply changes, the duplicate description becomes wrong.

**Alternative considered**: Keep the task loop inline but reference opsx:apply as "similar to." Rejected — ambiguous; the agent won't know which to follow.

---

### D2: review sub-agent delegates review mechanics to `superpowers:requesting-code-review`

**Decision**: `openspec-auto-review` invokes `superpowers:requesting-code-review` and then applies the three-category finding filter (in-scope → implement, out-of-scope → PR comment, unclear → leave for human). The review skill's unique value is the finding categorization, not the review itself.

**Rationale**: `superpowers:requesting-code-review` already handles diff reading, finding identification, and severity judgment. The openspec-auto layer adds scope awareness (the linked issue defines what's in-scope).

---

### D3: Main orchestrator adds model selection per sub-agent invocation

**Decision**: Each `Agent({...})` call in the main orchestrator specifies a `model` parameter:
- triage: `haiku` (mechanical fetch + filter)
- explore: `sonnet` (codebase reading, judgment)
- implement: `sonnet` (coordinates opsx:apply)
- review: `opus` (design judgment, finding categorization)

**Rationale**: The superpowers subagent-driven-development skill explicitly recommends model selection by task complexity. Triage is mechanical; review requires the most judgment.

---

### D4: `NEEDS_CONTEXT` status added to triage

**Decision**: The triage sub-agent gains a `NEEDS_CONTEXT` status for when `gh issue list` fails (auth error, rate limit). The orchestrator treats this the same as an auth failure — stop without scheduling a wakeup.

**Rationale**: Previously the triage skill had no way to signal a recoverable infrastructure failure distinct from "no eligible issues." `NEEDS_CONTEXT` is the superpowers convention for this case.

---

### D5: `superpowers:finishing-a-development-branch` added to Phase 7

**Decision**: Phase 7 (Wrap-up) invokes `superpowers:finishing-a-development-branch` before `opsx:archive`. This covers final diff review, squash/merge decisions, and PR readiness that the current skill omits.

**Rationale**: The wrap-up phase was thin — it only synced state, archived, and assigned reviewer. `finishing-a-development-branch` adds the quality gate the superpowers skill suite expects at this stage.

## Risks / Trade-offs

**R1: opsx:apply behavior changes break implement skill** → Mitigated by the fact that opsx:apply is maintained alongside openspec-auto; any breaking change would be coordinated.

**R2: Skills become too abstract** → Each skill still documents its unique additions explicitly; delegation calls are labeled with what the delegated skill does NOT cover.

**R3: Model selection hints may become stale as model names change** → Model hints use the symbolic names (`haiku`, `sonnet`, `opus`) not version-specific IDs, which are more stable.
