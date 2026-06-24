## Why

The triage stage currently wastes downstream cycles by (a) ignoring issues that are out of scope for the product's stated vision, (b) silently skipping duplicates and stale issues instead of closing them, and (c) leaving the orchestrator and reviewers guessing about *why* an issue was parked—making it hard to prioritize or unblock. These gaps mean agents spin on work that should never have started, and humans lose visibility into what's blocked and why.

## What Changes

- **VISION.md product-fit filter**: when the repo contains a `VISION.md` (or `docs/VISION.md`), the triage sub-agent reads it before evaluating issues and applies a fourth red flag — `Out of scope (vision)` — to issues that are clearly outside the product's stated purpose.
- **Defer/close behavior for rejected issues**: instead of silently skipping duplicate, stale, or out-of-scope issues, the triage sub-agent emits a `Deferred` list; the orchestrator posts a closing comment on each deferred issue (e.g. "Closing as duplicate of #N") and closes it via `gh issue close`.
- **Structured blocker taxonomy in PR comments**: when the orchestrator parks a PR as `NEEDS_INPUT` or `CI_BLOCKED`, it now includes a `Blocker:` line in the parking comment that names one of six reason codes — `no_repro`, `product_direction`, `missing_credentials`, `first_time_ci_approval`, `test_failure`, `unclear_requirements` — so humans can immediately understand the nature of the block.

## Capabilities

### New Capabilities

- `vision-fit-filter`: Triage reads `VISION.md` / `docs/VISION.md` when present and rejects issues that are clearly outside the product vision, naming the new `Out of scope (vision)` red flag.
- `triage-defer-close`: Triage emits a structured `Deferred` list alongside `Selected`; the orchestrator processes it by posting a reason-specific closing comment and calling `gh issue close` on each deferred issue.
- `blocker-taxonomy`: Explore and Implement sub-agents include a `Blocker:` reason code in their `NEEDS_INPUT` / `BLOCKED` / `CI_BLOCKED` output; the orchestrator reads it and includes it in the parking PR comment.

### Modified Capabilities

- `triage-eligibility-rules`: The red-flag list gains a fourth entry (`Out of scope (vision)`) and the output format gains a `Deferred` section alongside the existing `Selected` / `NO_ELIGIBLE` statuses.

## Impact

- `skill/openspec-auto/prompts/triage.md` — new VISION.md check section, updated Red Flags list, updated Output format (Deferred list)
- `skill/openspec-auto/SKILL.md` — Triage stage handling extended to process the `Deferred` list; parking comment writing extended to include the `Blocker:` line
- `skill/openspec-auto/prompts/explore.md` — `NEEDS_INPUT` output block gains a `Blocker:` field
- `skill/openspec-auto/prompts/implement.md` — `BLOCKED` and `CI_BLOCKED` output blocks gain a `Blocker:` field
- `openspec/specs/triage-eligibility-rules/spec.md` — updated to reflect the new fourth red flag
