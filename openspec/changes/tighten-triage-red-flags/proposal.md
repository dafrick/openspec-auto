## Why

The triage sub-agent is supposed to perform a mechanical survey — filter issues by obvious surface signals — but its current eligibility criteria read as "prove you are eligible," which implicitly invites investigative judgment. This caused triage to silently reject ambiguous issues (GitHub issue #7) by making calls that belong to the Explore phase, with no comment or PR to explain the decision.

## What Changes

- Add a `## Red Flags` section to `prompts/triage.md` listing concrete, surface-observable signals that warrant rejection, replacing the current open-ended prose criteria.
- Reframe the eligibility model from "all three criteria must pass" to "default-eligible; reject only on an obvious red flag observable from title, body, labels, and comments."
- Add an explicit constraint that triage must not reach conclusions requiring investigation (checking registries, reading linked code, evaluating feasibility).
- Add a `NO_ELIGIBLE` rationale requirement: when rejecting, triage must name the specific red flag observed, so the decision is auditable.

## Capabilities

### New Capabilities

- `triage-eligibility-rules`: The rules governing how triage decides to select, skip, or reject a new issue — specifically the red-flag model that replaces the prove-eligible gate.

### Modified Capabilities

<!-- No existing spec files exist yet; this is the first change against this repo. -->

## Impact

- `skill/openspec-auto/prompts/triage.md` — the only file changed.
- No changes to SKILL.md orchestration, survey.ts, or any other sub-agent prompt.
- No breaking changes to output format or status values.
