## 1. Update triage prompt — VISION.md check

- [x] 1.1 Add a "Check for VISION.md" section to `skill/openspec-auto/prompts/triage.md` that instructs the agent to read `VISION.md` (or `docs/VISION.md`) when present before evaluating any issue
- [x] 1.2 Add the fourth red flag entry `Out of scope (vision)` to the Red Flags list in `skill/openspec-auto/prompts/triage.md`, with instructions to reject only when the issue is *clearly* outside the stated vision (not merely tangential)

## 2. Update triage prompt — Deferred output format

- [x] 2.1 Add a `Deferred:` output block to the Output section of `skill/openspec-auto/prompts/triage.md` showing the format for listing rejected issues (issue number + red flag + one-line observation)
- [x] 2.2 Document in the triage prompt that the `Deferred:` block is additive — it MAY accompany any primary status (`SELECTED`, `NO_ELIGIBLE`, `RESUME`, `NEEDS_CONTEXT`)

## 3. Update orchestrator — process Deferred list

- [x] 3.1 Add a "Process Deferred list" step to the Triage stage description in `skill/openspec-auto/SKILL.md`: after routing on the primary status, if a `Deferred:` block is present, post a reason-specific closing comment on each issue and call `gh issue close <N>`
- [x] 3.2 Document the three comment templates in `skill/openspec-auto/SKILL.md` (one for each red flag family: duplicate, out-of-scope/vision, no-ask)
- [x] 3.3 Document that `Deferred` processing failures (e.g., a `gh issue close` call failing) SHALL NOT block the primary routing

## 4. Update explore prompt — Blocker reason code

- [x] 4.1 Add a `Blocker:` field to the `NEEDS_INPUT` output block in `skill/openspec-auto/prompts/explore.md` with the allowed values: `no_repro`, `product_direction`, `missing_credentials`, `unclear_requirements`
- [x] 4.2 Add inline guidance in the explore prompt for how to select the appropriate blocker code

## 5. Update implement prompt — Blocker reason code

- [x] 5.1 Add a `Blocker:` field to the `BLOCKED` output block in `skill/openspec-auto/prompts/implement.md` with the allowed values: `no_repro`, `missing_credentials`
- [x] 5.2 Add a `Blocker:` field to the `CI_BLOCKED` output block in `skill/openspec-auto/prompts/implement.md` with the allowed values: `first_time_ci_approval`, `test_failure`

## 6. Update orchestrator — parking comment includes Blocker

- [x] 6.1 Update the `NEEDS_INPUT` parking comment logic in `skill/openspec-auto/SKILL.md` to read the `Blocker:` line from the sub-agent output and include it in the PR comment (with graceful fallback when absent)
- [x] 6.2 Update the `CI_BLOCKED` parking comment logic in `skill/openspec-auto/SKILL.md` similarly

## 7. Update triage-eligibility-rules spec in openspec/specs

- [x] 7.1 Apply the delta from `openspec/changes/improve-triage-quality/specs/triage-eligibility-rules/spec.md` to `openspec/specs/triage-eligibility-rules/spec.md` — update the red-flag requirement to list all four flags and update the rejection scenarios to use `Deferred` language
