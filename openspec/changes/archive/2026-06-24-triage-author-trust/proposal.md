## Why

The most expensive failure mode in openspec-auto is selecting an issue, running the full Explore stage (a costly LLM call), generating blocking questions, and then parking the issue as `NEEDS_INPUT` — only to have the reporter never respond. This happens disproportionately with drive-by reporters: brand-new accounts, accounts with no prior activity in the repo, and accounts with no observable GitHub history. Adding author trust signals as a tiebreaker at triage reduces the frequency of dead-end `NEEDS_INPUT` states without blocking any issue outright.

## What Changes

- **triage sub-agent (`prompts/triage.md`)**: After ranking eligible issues by the existing criteria (recency, impact, effort), add a trust-evaluation step that fetches lightweight author signals via `gh api` and uses them as a tiebreaker between otherwise equal-priority candidates. Triage output gains a one-line `Trust:` annotation for the selected issue.
- **Orchestrator (`SKILL.md`)**: Triage stage description updated to document the trust annotation field and its purpose.
- **Explore sub-agent (`prompts/explore.md`)**: Accepts a new `{{AUTHOR_TRUST}}` placeholder populated by the orchestrator from triage's `Trust:` annotation, and uses it to calibrate the tone of any blocking questions it generates (more context-setting for low-trust/new accounts; more direct for known contributors).

## Capabilities

### New Capabilities

- `triage-author-trust`: Evaluates reporter trust signals during issue selection — account age, prior activity in the repo, and overall GitHub account activity — and surfaces a `Trust:` annotation in triage output. Used as a tiebreaker and as a risk signal passed downstream to Explore.

### Modified Capabilities

- `triage-eligibility-rules`: The trust evaluation extends the selection step (step 3 in triage.md) with a tiebreaker clause. It does NOT change the eligibility model (default-eligible, red-flags-only rejection) — it only influences ranking among eligible candidates and annotates the output.

## Impact

- `skill/openspec-auto/prompts/triage.md` — adds trust-evaluation step and `Trust:` output field
- `skill/openspec-auto/SKILL.md` — updates Triage stage documentation
- `skill/openspec-auto/prompts/explore.md` — adds `{{AUTHOR_TRUST}}` placeholder and usage instruction
- No new dependencies; uses `gh api` which is already required by the survey script
- No breaking changes to the orchestrator state machine; `Trust:` is an additive annotation
