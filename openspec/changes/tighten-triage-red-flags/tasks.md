## 1. Rewrite eligibility section in triage.md

- [x] 1.1 Replace the "three eligibility criteria" prose in step 3 with a default-eligible model: one sentence stating that all issues are eligible unless a red flag is present
- [x] 1.2 Add a `## Red Flags` section listing the three surface-observable red flags (No observable ask, Confirmed duplicate, Out of scope) with a one-line definition for each
- [x] 1.3 Add an explicit constraint block: triage SHALL NOT check external resources, evaluate feasibility, or reach a verdict requiring investigation — linking to SKILL.md's "no design judgment" mandate

## 2. Update NO_ELIGIBLE output requirement

- [x] 2.1 Update the `NO_ELIGIBLE` output block in the prompt to require naming the specific red flag observed (add an example line showing the pattern)

## 3. Verify

- [x] 3.1 Re-read the full updated `prompts/triage.md` and confirm: no "prove-eligible" language remains, red flags are listed, the no-investigation constraint is explicit, and NO_ELIGIBLE names the red flag
