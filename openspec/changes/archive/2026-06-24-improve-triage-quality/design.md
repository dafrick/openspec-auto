## Context

The openspec-auto orchestrator dispatches a triage sub-agent that reads a repo's open issues, filters them with a set of red flags, and either selects one for work or returns `NO_ELIGIBLE`. Currently the triage stage has three gaps:

1. It has no awareness of the repo's product vision — it treats every issue as potentially in-scope regardless of what the project is for.
2. Issues identified as duplicates, stale, or out-of-scope are silently dropped; they remain open and clutter the issue backlog.
3. When the orchestrator parks a PR as `NEEDS_INPUT` or `CI_BLOCKED`, the PR comment gives no structured reason for the block, making it hard for humans to triage quickly.

All three gaps are addressed by editing prompt files and the orchestrator's SKILL.md — no scripts, new NPM packages, or data-model changes are required.

## Goals / Non-Goals

**Goals:**
- Add a fourth triage red flag (`Out of scope (vision)`) activated when a `VISION.md` is present and the issue is clearly outside the product's stated purpose.
- Give the triage stage a `Deferred` output list and a corresponding orchestrator loop that closes each deferred issue with a reason-specific comment.
- Add a mandatory `Blocker:` reason code to the `NEEDS_INPUT`, `BLOCKED`, and `CI_BLOCKED` output blocks of explore and implement sub-agents, and surface it in the orchestrator's parking PR comment.
- Update `openspec/specs/triage-eligibility-rules/spec.md` to reflect the new fourth red flag.

**Non-Goals:**
- Automated staleness detection (time-based closing of issues with no activity).
- Changing the triage model selection or survey script.
- Altering the `SELECTED` / `RESUME` / `NO_ELIGIBLE` / `NEEDS_CONTEXT` statuses themselves — `Deferred` is additive.
- Adding new NPM scripts or TypeScript helpers.

## Decisions

### Decision 1: `Deferred` list is additive alongside existing statuses

**Options considered:**
- A) Replace `NO_ELIGIBLE` with `DEFERRED` when issues are found but all are rejected.
- B) Add a `Deferred` list to any triage output (including `SELECTED`) listing all rejected issues that should be actively closed.

**Choice: B** — The orchestrator already routes correctly on `SELECTED` / `NO_ELIGIBLE` / `RESUME`. Adding an optional `Deferred:` block to any status output keeps the routing logic unchanged: the orchestrator first routes on `Status:`, then processes the `Deferred` block if present. This is the smallest surface-area change.

### Decision 2: VISION.md check is a read-and-summarize, not a hard keyword match

**Options considered:**
- A) Ask the triage agent to do a keyword match against the VISION.md.
- B) Ask the triage agent to read the VISION.md and use judgment to decide if the issue is clearly outside the vision.

**Choice: B** — Vision documents are prose, not structured data. A keyword match would be brittle. The triage prompt already instructs the agent to apply judgment only when a red flag is *directly observable* — the same bar applies here: reject only when the issue is *clearly* outside scope, not merely orthogonal or tangential.

### Decision 3: Blocker reason codes are an enum, not free text

**Options considered:**
- A) Free-text `Blocker:` line.
- B) Fixed enum of reason codes.

**Choice: B** — A fixed enum (`no_repro`, `product_direction`, `missing_credentials`, `first_time_ci_approval`, `test_failure`, `unclear_requirements`) enables downstream tooling (dashboards, metrics) and gives humans a predictable scan target. The orchestrator includes the code verbatim in the PR comment.

### Decision 4: Closing deferred issues happens in the orchestrator, not the triage sub-agent

The triage sub-agent is read-only by design — it returns structured output and the orchestrator takes action. This keeps sub-agents stateless and idempotent. The orchestrator posts a closing comment then calls `gh issue close <N>` for each entry in the `Deferred` list.

## Risks / Trade-offs

- **Over-aggressive closing** — if the VISION.md check is applied loosely, legitimate issues get closed. Mitigation: the prompt instructs the agent to apply the vision filter only when the issue is *clearly* outside scope, and to prefer selecting ambiguous cases (matching the existing default-eligible model).
- **VISION.md not found at either path** — the check is skipped silently; existing behavior is unchanged. Mitigation: the triage prompt explicitly states the check is conditional on the file's presence.
- **Blocker code mismatch** — if an explore or implement sub-agent omits the `Blocker:` line, the orchestrator falls back to a generic parking comment. Mitigation: the orchestrator reads the field with a fallback; the prompt change is additive (not a breaking removal).
- **Closing issues that get reopened** — a human may reopen a mistakenly closed issue. The agent will re-triage it on the next run; since the deferred reason comment is visible, the human can also simply remove it and the agent will see it as a fresh issue.

## Migration Plan

No deployed state to migrate — all changes are to prompt files and SKILL.md. Changes take effect on the next invocation of the skill after the PR is merged.

## Open Questions

(none)
