## 1. Rewrite explore.md — structure and opening

- [ ] 1.1 Replace the opening goal statement: the issue is a problem description, not a spec; the agent's job is product translation following the Double Diamond; approach is the agent's call
- [ ] 1.2 Rename Step 2 to "Discover" and revise the Feature investigation checklist: replace "scope boundaries (what's explicitly out)" with JTBD extraction ("When [situation], I want [motivation], so I can [outcome]") required for all features; replace "scope boundaries" with "constraints stated in the issue — note whether each has an explicit reason (real) or no reason (feasibility guess)"
- [ ] 1.3 Revise the Bug investigation checklist: retain reproduction path, expected vs actual, affected code, spec coverage; frame fix approach as something to be recommended in the Recommend step, not derived implicitly

## 2. Add Define step to explore.md (first diamond converge)

- [ ] 2.1 Add Step 3 "Define": synthesize the JTBD and codebase findings into a solution-neutral Point of View; classify each issue constraint as real (has explicit reason) or assumed (feasibility guess)
- [ ] 2.2 Add HMW formulation to the Define step: derive a How Might We question from the Point of View; include the rule that HMW must not embed a solution or reference a specific technology; if HMW cannot be written without embedding a solution, broaden the Point of View first

## 3. Add Ideate step to explore.md (second diamond diverge)

- [ ] 3.1 Add Step 4 "Ideate": generate ≥2 Candidates that answer the How Might We; candidates are derived from the problem, not from the issue text; the issue's implied approach is not a required candidate; no evaluation during this step — generate first
- [ ] 3.2 Add the rule: if the issue's implied approach would not appear naturally as a candidate, it need not be listed; the Recommendation will note the departure in one sentence

## 4. Add Evaluate step to explore.md (Six Thinking Hats per candidate)

- [ ] 4.1 Add Step 5 "Evaluate": for each candidate, apply Yellow Hat (benefits, user value, why it works) and Black Hat (risks, failure modes, ux-principles.md violations, VISION.md conflicts)
- [ ] 4.2 Add Green Hat check: after evaluating all candidates, ask whether there is an obvious candidate not yet listed; if yes, add it and evaluate it
- [ ] 4.3 Add the rule: if all candidates violate a ux-principles.md failure mode and no compliant alternative can be found, return NEEDS_INPUT with a product_direction blocker

## 5. Add Recommend and Now/Next/Later steps to explore.md

- [ ] 5.1 Add Step 6 "Recommend": name the chosen candidate and explain the rationale in terms of the Evaluation; if the issue's implied approach is not the Recommendation, include one sentence of acknowledgment ("the issue suggested X; not carried forward because Y")
- [ ] 5.2 Add Step 7 "Scope — Now / Next / Later": Now = smallest set that solves the core problem well (this PR); Next = clear follow-up that could be its own issue; Later = future direction without commitment; no "Out of scope" list
- [ ] 5.3 Add the scope rule: if the full Recommendation requires large scope, propose a Now/Next/Later sequencing breakdown and return NEEDS_INPUT with a concrete "which phase to start with?" question; never cut scope to an inferior solution

## 6. Update the discovery output format in explore.md

- [ ] 6.1 Replace the current output section list (Problem, Classification, Findings, Approach, Out of scope) with the new sections: Point of View · Classification · How Might We · Constraints · Candidates · Recommendation · Now / Next / Later
- [ ] 6.2 Update the blocking question definition: NEEDS_INPUT only when approach is genuinely unresolvable; explicitly list what is NOT blocking — diverging from issue framing, issue constraint conflicts with a principle but compliant alternative exists, ≥2 candidates with one clearly better

## 7. Rewrite proposal-review.md — Six Thinking Hats judge criteria

- [ ] 7.1 Update the opening preamble: "read the issue for the underlying user problem — the proposal's Point of View and Recommendation may diverge from the approach suggested in the issue; that is expected and correct"
- [ ] 7.2 Add Blue Hat criterion: process gate — are Point of View, How Might We, Candidates, and Recommendation sections present and structurally sound? Missing or empty = blocking; proceed to other hats only if Blue Hat passes
- [ ] 7.3 Add White Hat criterion: facts check — does the Point of View accurately describe the real problem? Are constraint classifications correct? Are candidate technical claims accurate?
- [ ] 7.4 Add Yellow Hat criterion: value check — does the Recommendation solve the job-to-be-done from the Point of View? Does it align with VISION.md?
- [ ] 7.5 Add Black Hat criterion: risk check — does the chosen approach violate any ux-principles.md failure modes without human authorization? Technical risks or regressions?
- [ ] 7.6 Add Red Hat criterion: perspective check — wear three stakeholder hats in sequence: product developer (is this implementable and maintainable?), product manager (is the Now/Next/Later sequencing sensible and the scope right?), UX researcher (does the solution address the user's job and feel intuitive?)
- [ ] 7.7 Add Green Hat criterion: coverage check — is there an obvious candidate not in the Candidates list that would change the Recommendation? Are there untested assumptions in the Recommendation rationale?
- [ ] 7.8 Remove or subsume the legacy four criteria (Proposal, Design, Specs, Tasks) into the Six Hats structure — retain artifact completeness checks under Blue Hat (process check)
