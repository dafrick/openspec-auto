## Context

The triage sub-agent runs in the cheapest execution slot (fast/light model, per SKILL.md model selection table). Its architectural mandate is "mechanical fetch + filter, no design judgment." However, the current `prompts/triage.md` frames eligibility as three gates that all must pass — Clarity, No open questions, Bounded scope — which implicitly invites the model to investigate in order to reach a verdict. Issue #7 showed this in practice: triage checked external registries and inferred feasibility, work that belongs to Explore. The result was a silent drop with no PR or comment.

This design covers the prompt-only change to `prompts/triage.md`.

## Goals / Non-Goals

**Goals:**
- Replace the "prove-eligible" frame with a "default-eligible; reject on obvious red flag" frame.
- Define red flags as signals observable purely from title, body, labels, and comments — no investigation required.
- Require `NO_ELIGIBLE` output to name the specific red flag, making rejections auditable.
- Keep the triage output format unchanged (RESUME / SELECTED / NO_ELIGIBLE / NEEDS_CONTEXT).

**Non-Goals:**
- Changing SKILL.md, survey.ts, or any other sub-agent prompt (that belongs to the `explore-before-workspace` change).
- Adding a new triage output status.
- Eliminating all false negatives (some ambiguous issues will still be dropped; Explore's NEEDS_INPUT mechanism handles refinement once a selection is made).

## Decisions

### Default-eligible model over prove-eligible

The current criteria read as "all three must pass." Any uncertainty about one criterion causes triage to investigate, which bleeds into Explore's responsibility. Inverting the default — assume eligible, reject only on an *obvious* red flag — means the model's judgment is applied minimally and only to clear-cut signals.

**Why not enumerate a longer eligibility checklist instead?** Longer checklists invite more judgment calls at each item. Red flags are faster to evaluate (pattern-match, not reason-through) and naturally stay at the surface level.

### Red flags are surface-observable only

Each red flag must be determinable from a literal read of title, body, labels, and comments. No flag requires checking external resources, reading linked code, or evaluating technical feasibility. This is the operationalization of the "no design judgment" constraint already stated in SKILL.md.

Proposed red flags:
1. **No observable ask** — title and body together contain no discernible problem or desired behavior (e.g., a blank body and a one-word title).
2. **Duplicate signal** — the issue body or a maintainer comment explicitly identifies it as a duplicate and names the canonical issue.
3. **Out of scope** — the issue explicitly targets a different repository, product, or domain (e.g., a bug filed in the wrong repo that a maintainer confirmed belongs elsewhere).

These three cover all clear drop cases. Anything ambiguous defaults to SELECTED — Explore will surface blocking questions if needed.

### Named rationale in NO_ELIGIBLE

Currently the output allows free-form explanation. Requiring the agent to name which red flag it observed (by number or label) keeps the reasoning at the surface level — if it can't name a red flag, the issue shouldn't be dropped.

### No output format changes

Adding a rationale requirement to `NO_ELIGIBLE` is backward-compatible: the orchestrator only reads the status line (`**Status:** NO_ELIGIBLE`). The body of that block is already free-form; requiring it to name a red flag is a constraint on content, not structure.

## Risks / Trade-offs

- **Under-rejection**: More issues will reach Explore that previously would have been dropped. This is intentional — Explore has the NEEDS_INPUT mechanism to surface blocking questions. The cost is slightly more Explore runs, but they are caught cleanly.
- **Model still over-investigates**: Even with red-flag framing, a capable model might still reason beyond the surface. Mitigation: the instructions explicitly state "do not investigate" and "do not check external resources," making the constraint unambiguous.
- **Red flag list is not exhaustive**: Edge cases will arise. Mitigation: the list can grow in future changes; the default-eligible model means unhandled edge cases pass through to Explore rather than silently dropping.
