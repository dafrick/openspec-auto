## Why

When openspec-auto hands off a PR for human review, the reviewer must trust the agent's work was tested correctly — but the PR description only shows *what* was built, not *how it was verified*. There is no evidence trail: a reviewer asking "how was this tested?" has no answer in the PR.

## What Changes

- The **code-review sub-agent** (`prompts/code-review.md`) must include a `**Proof:**` block in its output alongside `**Status:**`, documenting what evidence it gathered: commands run, CI state, manual checks, and caveats.
- The **orchestrator's Wrap up stage** (`SKILL.md`) extracts this proof block from the code-review output and posts it as a PR comment titled `## Test Evidence` before requesting human review.
- The **implement sub-agent** (`prompts/implement.md`) adds a `**Tests run:**` line to its `DONE` output, summarizing what tests were executed.
- The **orchestrator's Implement handling** (`SKILL.md`) captures the tests-run summary when writing the implementation summary to the PR description.

## Capabilities

### New Capabilities

- `proof-block-in-code-review`: The code-review sub-agent outputs a structured `**Proof:**` block alongside its status verdict, covering test commands run, CI state, manual verification, and caveats.
- `test-evidence-pr-comment`: The orchestrator posts the proof block as a `## Test Evidence` PR comment during Wrap up, making verification evidence visible to human reviewers.
- `tests-run-summary-in-implement`: The implement sub-agent includes a `**Tests run:**` summary in its `DONE` output, captured by the orchestrator and included in the implementation summary written to the PR description.

### Modified Capabilities

*(none — no existing spec-level requirements are changing)*

## Impact

- `skill/openspec-auto/prompts/code-review.md` — output format extended with required `**Proof:**` block
- `skill/openspec-auto/prompts/implement.md` — `DONE` output extended with `**Tests run:**` line
- `skill/openspec-auto/SKILL.md` — Wrap up stage: extract proof block, post as PR comment; Implement handling: capture tests-run summary
