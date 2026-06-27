## Why

The explore stage treats issues as specifications to implement — accepting stated constraints and implied solutions without genuine product evaluation. This produces changes that solve the stated issue rather than the underlying user need. (Concrete failure: dafrick/skillet-cli#120 shipped a UX principle violation because issue #110 said "no new command" and the agent accepted that as a hard constraint instead of evaluating whether a command was actually the right solution.)

## What Changes

- **`skill/openspec-auto/prompts/explore.md`** — restructured around the Double Diamond product development process:
  - Two explicit diamonds: Problem Space (Discover → Define) and Solution Space (Ideate → Evaluate → Recommend)
  - Product vocabulary throughout: Point of View, Jobs-to-be-Done, How Might We, Candidates, Recommendation
  - Step 2 (Discover): for features, extract the Job-to-be-Done ("When [situation], I want [motivation], so I can [outcome]") — required, not optional
  - Step 3 (Define): synthesize into a solution-neutral Point of View; classify issue constraints as real vs. feasibility guesses; formulate a How Might We question as the bridge to solution generation
  - Step 4 (Ideate): generate ≥2 Candidates from the HMW for all issue types (features and bugs); for bugs, "won't fix" and "fix as reported" are always candidates; derived from the problem, not from the issue text; issue's implied approach is not a required candidate
  - Step 5 (Evaluate): apply Six Thinking Hats per candidate — Yellow (benefits), Black (risks/principle violations), Green (missing candidates)
  - Step 6 (Recommend): converge to one approach; if the issue's implied approach isn't a candidate, note why in one sentence
  - Step 7 (Scope): Now / Next / Later breakdown replaces the "Out of scope" list; quality is fixed, scope is negotiated via sequencing

- **`skill/openspec-auto/prompts/proposal-review.md`** — expanded judge criteria using Six Thinking Hats:
  - Blue Hat: process check — two failure modes: discovery sections missing → NEEDS_INPUT (human re-explores or abandons); proposal artifacts missing → CHANGES_REQUESTED (Propose fixes)
  - White Hat: facts check — does the POV accurately describe the real problem? Are constraint classifications correct?
  - Yellow Hat: value check — does the recommendation solve the job-to-be-done? Does it align with VISION.md?
  - Black Hat: risk check — principle violations, technical debt, regressions, authorization for deviations
  - Red Hat: perspective check — how does this look through a product developer's lens? A PM's? A UX researcher's? Gut coherence of the overall proposal
  - Green Hat: coverage check — is there an obvious candidate not considered? Untested assumptions?

## Capabilities

### New Capabilities

- `explore-product-thinking`: The Double Diamond structured process for the explore stage — JTBD extraction, POV definition, HMW framing, Candidate ideation (all issue types including bugs), Six Thinking Hats evaluation, Recommendation with Now/Next/Later scoping; architectural rework and large-scope NEEDS_INPUT triggers; structured Blocking Questions output format
- `proposal-review-six-hats`: Six Thinking Hats evaluation framework for proposal-review — Blue/White/Yellow/Black/Red/Green hat criteria as a union with (not replacement of) the current four-criterion judge; Blue Hat distinguishes structural failures (NEEDS_INPUT → human) from artifact gaps (CHANGES_REQUESTED → Propose)

### Modified Capabilities

<!-- No existing global specs cover explore or proposal-review behavior -->

## Impact

- `skill/openspec-auto/prompts/explore.md` — primary change; prompt restructured from ~72 lines to a Double Diamond workflow
- `skill/openspec-auto/prompts/proposal-review.md` — expanded judge criteria; existing four criteria (Proposal, Design, Specs, Tasks) replaced by Six Thinking Hats evaluation
- No runtime code changes; all changes are to agent prompt files
- Downstream: the explore discovery output format changes (new section names: Point of View, How Might We, Candidates, Recommendation, Now/Next/Later); the propose stage reads this output, so prompt wording may need updating if it references old section names
